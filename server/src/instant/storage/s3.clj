(ns instant.storage.s3
  (:require [clojure.string :as string]
            [clojure.java.io :as io]
            [instant.util.s3 :as s3-util]
            [instant.flags :as flags])
  (:import
   [java.time Duration]))

;; Legacy S3 migration helpers
;; ------------------
(defn migrating? []
  (-> (flags/storage-migration) :useLocationId? not))

(defn ->legacy-object-key [app-id filename]
  (str app-id "/" filename))

(defn legacy-object-key->path
  "Extract path from our S3 object keys"
  [object-key]
  (let [[_app-id & path] (string/split object-key #"/")]
    (string/join "/" path)))

(defn filename->bin
  ^long [^String filename]
  (mod (Math/abs (.hashCode filename)) 10))

(defn ->path-object-key
  "We prefix objects with an app id and bin. Combined with a filename
  this gives us our key for each object."
  [app-id filename]
  (let [bin (filename->bin filename)
        fname (if (string/starts-with? filename "/")
                (subs filename 1)
                filename)]
    (str app-id "/" bin "/" fname)))

(defn path-object-key->path
  "Extract path from our S3 object keys"
  [object-key]
  (let [[_app-id _bin & path] (string/split object-key #"/")]
    (string/join "/" path)))

;; S3 path manipulation
;; ----------------------
(defn location-id->bin
  "We add a bin to the location id to scale S3 performance
   See: https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html"
  ^long [^String location-id]
  (mod (Math/abs (.hashCode location-id)) 10))

(defn ->object-key
  "Object keys have the shape of app-id/bin/location-id"
  [app-id ^String location-id]
  (str app-id "/" (location-id->bin location-id) "/" location-id))

(defn object-key->app-id
  "Extract app-id from our S3 object keys"
  [object-key]
  (first (string/split object-key #"/")))

(defn object-key->bin
  "Extract bin from our S3 object keys"
  [object-key]
  (second (string/split object-key #"/")))

(defn object-key->location-id
  "Extract location-id from our S3 object keys"
  [object-key]
  (last (string/split object-key #"/")))

;; Instant <> S3 integration
;; ----------------------
(defn upload-file-to-s3 [{:keys [app-id path location-id] :as ctx} file]
  (when (not (instance? java.io.InputStream file))
    (throw (Exception. "Unsupported file format")))
  (if (migrating?)
    (let [baos (java.io.ByteArrayOutputStream.)
          _ (io/copy file baos)
          bytes (.toByteArray baos)
          ctx* (assoc ctx :object-key (->object-key app-id location-id))
          ctx-legacy* (assoc ctx :object-key (->path-object-key app-id path))]
      (s3-util/upload-stream-to-s3 ctx-legacy* (io/input-stream bytes))
      (s3-util/upload-stream-to-s3 ctx* (io/input-stream bytes)))
    (let [ctx* (assoc ctx :object-key (->object-key app-id location-id))]
      (s3-util/upload-stream-to-s3 ctx* file))))

(defn format-object [{:keys [object-metadata]}]
  (-> object-metadata
      (select-keys [:content-disposition :content-type :content-length :etag])
      (assoc :size (:content-length object-metadata)
             :last-modified (-> object-metadata :last-modified .toEpochMilli))))

(defn get-object-metadata
  ([app-id location-id] (get-object-metadata s3-util/default-bucket app-id location-id))
  ([bucket-name app-id location-id]
   (let [object-key (->object-key app-id location-id)]
     (format-object (s3-util/head-object bucket-name object-key)))))

(defn delete-file! [app-id path location-id]
  (when (migrating?)
    (s3-util/delete-object (->path-object-key app-id path)))
  (when location-id
    (s3-util/delete-object (->object-key app-id location-id))))

(defn bulk-delete-files! [app-id paths location-ids]
  (when (migrating?)
    (let [path-keys (mapv
                     (fn [path] (->path-object-key app-id path))
                     paths)]
      (s3-util/delete-objects-paginated path-keys)))
  (let [location-keys (mapv
                       (fn [location-id] (->object-key app-id location-id))
                       location-ids)]
    (s3-util/delete-objects-paginated location-keys)))

(defn path-url [app-id filename]
  (let [duration (Duration/ofDays 7)
        object-key (->path-object-key app-id filename)]
    (str (s3-util/generate-presigned-url
          {:method :get
           :bucket-name s3-util/default-bucket
           :key object-key
           :duration duration}))))

(defn location-id-url [app-id location-id]
  (let [duration (Duration/ofDays 7)
        object-key (->object-key app-id location-id)]
    (str (s3-util/generate-presigned-url
          {:method :get
           :bucket-name s3-util/default-bucket
           :key object-key
           :duration duration}))))

(defn create-signed-download-url! [app-id path location-id]
  (if (migrating?)
    (path-url app-id path)
    (when location-id
      (location-id-url app-id location-id))))

;; S3 Usage Metrics
;; These functions calculate usage by talking to S3 directly. We can use these
;; for debugging whenever we suspect that our usage metrics based on triples
;; are off.
;; ----------------------

(defn list-all-app-objects []
  (loop [all-objects []
         continuation-token nil]
    (let [opts (if continuation-token
                 {:continuation-token continuation-token}
                 {})
          {:keys [object-summaries next-continuation-token truncated?]}
          (s3-util/list-objects opts)]
      (if truncated?
        (recur (into all-objects object-summaries) next-continuation-token)
        (into all-objects object-summaries)))))

(defn list-objects-by-app []
  (group-by #(object-key->app-id (:key %)) (list-all-app-objects)))

(defn calculate-app-metrics []
  (let [objects-by-app-id (list-objects-by-app)]
    (reduce (fn [acc [app-id objects]]
              (assoc acc app-id {:total-byte-size (reduce (fn [acc obj] (+ acc (:size obj))) 0 objects)
                                 :total-file-count (count objects)}))
            {} objects-by-app-id)))

(comment
  (count (list-all-app-objects))
  (list-objects-by-app)
  (calculate-app-metrics))
