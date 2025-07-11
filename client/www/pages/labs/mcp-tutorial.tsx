import { useState } from 'react';
import Head from 'next/head';
import { Tab } from '@headlessui/react';
import { Fence, Copyable, SubsectionHeading } from '@/components/ui';
import {
  Section,
  MainNav,
  LandingFooter,
  LandingContainer,
  PageProgressBar,
  H2,
  H3,
} from '@/components/marketingUi';
import clsx from 'clsx';
import {
  ClipboardDocumentIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';
import copy from 'copy-to-clipboard';
import fs from 'fs';
import path from 'path';

function getFiles(): Record<string, string> {
  const markdownDir = path.join(process.cwd(), 'data', 'mcp-tutorial');
  return fs
    .readdirSync(markdownDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .reduce(
      (acc, fileName) => {
        const name = fileName.replace(/\.md$/, '');
        const content = fs.readFileSync(
          path.join(markdownDir, fileName),
          'utf8',
        );
        acc[name] = content;
        return acc;
      },
      {} as Record<string, string>,
    );
}

type MarkdownContent = {
  files: Record<string, string>;
};

type ClientType = 'cursor' | 'claude-code';

const pageTitle =
  'Whirlwind tour: Build and deploy a full-stack app with InstantDB';

const cursorMCPConfig = `{
  "mcpServers": {
    "instant": {
      "url": "https://mcp.instantdb.com/mcp"
    }
  }
}`;

const examplePrompts = [
  {
    title: 'Habit Tracker',
    content:
      'Create a habit tracking app where users can create habits, mark daily completions, and visualize streaks. Include features for setting habit frequency (daily/weekly), viewing completion calendars, and tracking overall progress percentages.\n\nKeep the code to < 1000 lines.\n\nSeed with 5-6 sample habits like "Exercise", "Read", "Meditate" with 30 days of completion history.',
  },
  {
    title: 'Trivia Game',
    content:
      'Use InstantDB to create a trivia game with multiple-choice questions, score tracking, and category selection. Players should see immediate feedback on answers, track their high scores, and compete on a leaderboard.\n\nKeep the code to < 1000 lines.\n\nSeed with 30-40 questions across categories like "Science", "History", "Sports", and "Entertainment".',
  },
  {
    title: 'Job Board',
    content:
      'Build a job board app where employers can post jobs and job seekers can browse and save listings. Include filtering by job type, location, and salary range, plus a simple application tracking system.\n\nKeep the code to < 1000 lines.\n\nSeed with 15-20 job listings across categories like "Engineering", "Design", "Marketing" with various companies and locations.',
  },
];

export async function getStaticProps() {
  const files = getFiles();

  return {
    props: {
      files,
    },
  };
}

function CopyButton({
  text,
  label = 'Copy',
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
    >
      {copied ? (
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4" />
      )}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function FileContentCard({
  title,
  content,
  filename,
  description,
}: {
  title: string;
  content: string;
  filename?: string;
  description: string;
}) {
  return (
    <div className="max-w-sm border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div>
        <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
        {filename && (
          <p className="text-xs text-gray-600 font-mono mb-2">{filename}</p>
        )}
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <CopyButton text={content} />
      </div>
    </div>
  );
}

function PromptExample({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between mb-4">
        <SubsectionHeading className="flex-1">{title}</SubsectionHeading>
        <CopyButton text={content} label="Copy Prompt" />
      </div>
      <div className="bg-gray-50 rounded-md p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap border-l-4 border-l-gray-300">
        {content}
      </div>
    </div>
  );
}

export default function McpTutorial({ files }: MarkdownContent) {
  const [selectedClient, setSelectedClient] = useState<ClientType>('cursor');

  const {
    'cursor-rules': cursorRulesContent,
    claude: claudeMdContent,
    'claude-rules': claudeRulesContent,
  } = files;

  const clientConfigs = {
    cursor: {
      name: 'Cursor',
      setupContent: (
        <div className="space-y-4">
          <p>Click this button to install the Instant MCP server in Cursor:</p>
          <div className="flex">
            <a
              href="https://cursor.com/install-mcp?name=InstantDB&config=eyJ1cmwiOiJodHRwczovL21jcC5pbnN0YW50ZGIuY29tL21jcCJ9"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                width={150}
                src="https://cursor.com/deeplink/mcp-install-dark.svg"
                alt="Install MCP Server"
                className="hover:opacity-80 transition-opacity"
              />
            </a>
          </div>
          <p>
            Alternatively you can paste this into your `~/.cursor/mcp.json`
            directly
          </p>
          <Fence code={cursorMCPConfig} copyable={true} language="json" />
          <p>
            You should now see the Instant MCP server in your MCP servers list.
            If you don't you may need to restart Cursor. Once you see it, click
            the "Needs Login" button to go through the auth flow.
          </p>
        </div>
      ),
      rulesContent: (
        <div className="space-y-6">
          <FileContentCard
            title="Instant Rules for Cursor"
            content={cursorRulesContent}
            filename=".cursor/rules/instant.md"
            description="Click the button below to copy the rules for Instant and paste them into .cursor/rules/instant.md in the root of your project."
          />
        </div>
      ),
    },
    'claude-code': {
      name: 'Claude Code',
      setupContent: (
        <div className="space-y-4">
          <p>
            If you're on a paid plan, you can add the server via the command
            line:
          </p>
          <Copyable value="claude mcp add instant -s user -t http https://mcp.instantdb.com/mcp" />
          <p>Now you can run through the following:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Run <code>claude</code> in your terminal to start the Claude Code
              CLI.
            </li>
            <li>
              Run <code>/mcp</code> to see your list of MCP servers.
            </li>
            <li>
              See <code>instant</code> listed there!
            </li>
            <li>
              Select it and go through the auth flow to enable the Instant MCP
              server in your claude code sessions!
            </li>
          </ol>
        </div>
      ),
      rulesContent: (
        <div className="flex gap-6 flex-wrap">
          <FileContentCard
            title="CLAUDE.md"
            content={claudeMdContent}
            filename="CLAUDE.md"
            description="Click the button below to copy instructions for Claude to use Instant rules. Paste these into a file named CLAUDE.md in the root of your project."
          />
          <FileContentCard
            title="Instant Rules for Claude Code"
            content={claudeRulesContent}
            filename="instant-rules.md"
            description="Click the button below to copy the rules for Instant and paste them into instant-rules.md in the same directory as your CLAUDE.md"
          />
        </div>
      ),
    },
  };

  return (
    <LandingContainer>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="Build full-stack apps with InstantDB in 5-10 minutes!"
        />
      </Head>

      <PageProgressBar />
      <MainNav />
      <Section>
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mt-12 mb-8">
            <div className="mb-6">
              <H2>{pageTitle}</H2>
            </div>
            <p className="text-lg text-gray-700 mb-8">
              👋 Hey there!
              <br />
              <br />
              In this tutorial we'll build a full-stack app with InstantDB.
              Within 5-10 minutes you'll have an app that you can run locally
              and deploy!
            </p>

            <div>
              <div className="mb-6">
                <H3>What we'll do:</H3>
              </div>
              <ol className="space-y-3 text-lg text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="font-mono text-gray-500">1.</span>
                  <span>Install the Instant MCP server</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-gray-500">2.</span>
                  <span>Scaffold a starter app with Next.js</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-gray-500">3.</span>
                  <span>Add some rules for our LLMs to understand Instant</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-gray-500">4.</span>
                  <span>
                    Prompt the LLM to build us an app! (This is the fun part!)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-gray-500">5.</span>
                  <span>Deploy the app to Vercel</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Step 1: Install MCP Server */}
          <div className="mb-16">
            <div className="mb-6">
              <H3>1. Install the Instant MCP server</H3>
            </div>
            <p className="text-gray-700 mb-6">
              Below are instructions on how to add the remote Instant MCP server
              to your MCP client. If your client isn't listed here you can check
              out our{' '}
              <a
                href="https://www.instantdb.com/docs/using-llms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                docs
              </a>{' '}
              to see how to install the MCP locally.
            </p>

            {/* Client Selector */}
            <Tab.Group
              selectedIndex={Object.keys(clientConfigs).indexOf(selectedClient)}
              onChange={(index) =>
                setSelectedClient(
                  Object.keys(clientConfigs)[index] as ClientType,
                )
              }
            >
              <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6">
                {Object.entries(clientConfigs).map(([key, config]) => (
                  <Tab
                    key={key}
                    className={({ selected }) =>
                      clsx(
                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                        'ring-white ring-opacity-60 ring-offset-2 ring-offset-gray-400 focus:outline-none focus:ring-2',
                        selected
                          ? 'bg-white shadow text-gray-900'
                          : 'text-gray-600 hover:bg-white/60 hover:text-gray-900',
                      )
                    }
                  >
                    {config.name}
                  </Tab>
                ))}
              </Tab.List>
              <Tab.Panels>
                {Object.entries(clientConfigs).map(([key, config]) => (
                  <Tab.Panel key={key} className="py-6 focus:outline-none">
                    {config.setupContent}
                  </Tab.Panel>
                ))}
              </Tab.Panels>
            </Tab.Group>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-amber-800">
                <strong>Callout:</strong> After adding the MCP server you'll
                need to go through an OAuth flow to access the tools. Be sure to
                go through the auth flow to enable the Instant MCP server in
                your client!
              </p>
            </div>
          </div>

          {/* Step 2: Scaffold App */}
          <div className="mb-16">
            <div className="mb-6">
              <H3>2. Scaffold a starter app with Next.js</H3>
            </div>
            <p className="text-gray-700 mb-6">
              With the Instant MCP server installed, we can now scaffold a
              starter app. Run the following commands in your terminal
            </p>
            <Fence
              code={`# Scaffold a Next.js app
npx create-next-app@latest vibes --yes

# Add Instant's React SDK to the project
cd vibes
npm i @instantdb/react`}
              language="bash"
            />
          </div>

          {/* Step 3: Add Rules */}
          <div className="mb-16">
            <div className="mb-6">
              <H3>3. Add some rules for our LLMs to understand Instant</H3>
            </div>
            <p className="text-gray-700 mb-6">
              Now that we have a Next.js app scaffolded, we need to add some
              rules for our LLMs to understand how to interact with InstantDB.
              Select your client below to get the context set up.
            </p>

            {/* Rules for selected client */}
            <Tab.Group
              selectedIndex={Object.keys(clientConfigs).indexOf(selectedClient)}
              onChange={(index) =>
                setSelectedClient(
                  Object.keys(clientConfigs)[index] as ClientType,
                )
              }
            >
              <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6">
                {Object.entries(clientConfigs).map(([key, config]) => (
                  <Tab
                    key={key}
                    className={({ selected }) =>
                      clsx(
                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                        'ring-white ring-opacity-60 ring-offset-2 ring-offset-gray-400 focus:outline-none focus:ring-2',
                        selected
                          ? 'bg-white shadow text-gray-900'
                          : 'text-gray-600 hover:bg-white/60 hover:text-gray-900',
                      )
                    }
                  >
                    {config.name}
                  </Tab>
                ))}
              </Tab.List>
              <Tab.Panels>
                {Object.entries(clientConfigs).map(([key, config]) => (
                  <Tab.Panel key={key} className="py-6 focus:outline-none">
                    {config.rulesContent}
                  </Tab.Panel>
                ))}
              </Tab.Panels>
            </Tab.Group>
          </div>

          {/* Step 4: Build the App */}
          <div className="mb-16">
            <div className="mb-6">
              <H3>
                4. Prompt the LLM to build us an app! (This is the fun part!)
              </H3>
            </div>
            <div className="text-gray-700 space-y-3 mb-6">
              <p>
                Woohoo! Now that we've got everything set up, we're ready to
                build an app! Fire up your editor (cursor, windsurf, zed, etc.)
                or your CLI tool (cursor, gemini, etc) and type up a prompt. Hit
                enter and watch the magic happen!
              </p>
              <p>Here are some example prompts for inspiration</p>
            </div>
            <div className="space-y-6">
              {examplePrompts.map((prompt, index) => (
                <PromptExample
                  key={index}
                  title={prompt.title}
                  content={prompt.content}
                />
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-amber-800">
                <strong>Callout:</strong> If you run into any bugs check out the
                debugging section below to fix common issues.
              </p>
            </div>
          </div>

          {/* Step 5: Deploy */}
          <div className="mb-16">
            <div className="mb-6">
              <H3>5. Deploy the app to Vercel</H3>
            </div>
            <p className="text-gray-700 mb-6">
              Once you've got a working app, you can get it live by deploying it
              to Vercel!
            </p>
            <Copyable value="pnpx vercel --prod" />
            <p className="text-gray-700 mt-6">
              🎉 Huzzah! You've built a full-stack app with InstantDB in just a
              few minutes!
            </p>
          </div>
        </div>
      </Section>
      <LandingFooter />
    </LandingContainer>
  );
}
