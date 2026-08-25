const fs =
  require('fs');

const path =
  require('path');

const PROJECT_ROOT =
  path.resolve(
    __dirname,
    '..',
    '..'
  );

const BACKEND_SOURCE =
  path.join(
    PROJECT_ROOT,
    'backend',
    'src'
  );

const FRONTEND_SOURCE =
  path.join(
    PROJECT_ROOT,
    'frontend',
    'src'
  );

const OUTPUT_FILE =
  path.join(
    PROJECT_ROOT,
    'backend',
    'legacy-audit-report.txt'
  );

const INCLUDED_EXTENSIONS =
  new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.prisma'
  ]);

const IGNORED_DIRECTORIES =
  new Set([
    'node_modules',
    'dist',
    'build',
    '.git',
    '.vite',
    'coverage',
    'prisma\\migrations',
    'prisma/migrations'
  ]);

const SEARCH_RULES = [
  {
    category:
      'Legacy Sender Configuration',

    patterns: [
      'sender_config.json',
      '/api/config',
      "'/config'",
      '"/config"',
      'config.routes',
      'config.controller'
    ]
  },

  {
    category:
      'Legacy Template Storage',

    patterns: [
      'email_template.json',
      '/api/template',
      "'/template'",
      '"/template"',
      'template.routes',
      'template.controller'
    ]
  },

  {
    category:
      'Legacy Recipient Storage',

    patterns: [
      'extracted_emails.txt',
      'recipient_file',
      'recipientfile',
      'emails.txt'
    ]
  },

  {
    category:
      'Legacy Sent Email Storage',

    patterns: [
      'sent_emails.json',
      'sentemails.json'
    ]
  },

  {
    category:
      'Legacy Excel History',

    patterns: [
      'send_history.xlsx',
      '.xlsx',
      'exceljs',
      'xlsx',
      'workbook'
    ]
  },

  {
    category:
      'Legacy Follow-Up Storage',

    patterns: [
      'followup_tracker.json',
      'follow_up_tracker.json',
      'followuptracker.json'
    ]
  },

  {
    category:
      'Legacy Shared Resume',

    patterns: [
      'resume_file',
      'resumefile',
      '/upload/resume',
      '/upload/resume/status',
      'upload/resume',
      'buildattachments()',
      'path.util'
    ]
  },

  {
    category:
      'Direct File Read or Write',

    patterns: [
      'readfilesync',
      'writefilesync',
      'appendfilesync',
      'readfile(',
      'writefile(',
      'appendfile(',
      'createwritestream'
    ]
  },

  {
    category:
      'JSON File Parsing or Serialization',

    patterns: [
      'json.parse',
      'json.stringify'
    ]
  }
];

function shouldIgnoreDirectory(
  directoryPath
) {
  const normalizedPath =
    directoryPath.replace(
      /\\/g,
      '/'
    );

  for (
    const ignoredDirectory of
      IGNORED_DIRECTORIES
  ) {
    const normalizedIgnored =
      ignoredDirectory.replace(
        /\\/g,
        '/'
      );

    if (
      normalizedPath.includes(
        `/${normalizedIgnored}/`
      ) ||
      normalizedPath.endsWith(
        `/${normalizedIgnored}`
      )
    ) {
      return true;
    }
  }

  return false;
}

function collectSourceFiles(
  directoryPath
) {
  if (
    !fs.existsSync(
      directoryPath
    )
  ) {
    return [];
  }

  const collectedFiles =
    [];

  const entries =
    fs.readdirSync(
      directoryPath,
      {
        withFileTypes:
          true
      }
    );

  for (
    const entry of
      entries
  ) {
    const fullPath =
      path.join(
        directoryPath,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      if (
        shouldIgnoreDirectory(
          fullPath
        )
      ) {
        continue;
      }

      collectedFiles.push(
        ...collectSourceFiles(
          fullPath
        )
      );

      continue;
    }

    const extension =
      path
        .extname(
          entry.name
        )
        .toLowerCase();

    if (
      INCLUDED_EXTENSIONS.has(
        extension
      )
    ) {
      collectedFiles.push(
        fullPath
      );
    }
  }

  return collectedFiles;
}

function getRelativePath(
  filePath
) {
  return path
    .relative(
      PROJECT_ROOT,
      filePath
    )
    .replace(
      /\\/g,
      '/'
    );
}

function getLineMatches(
  filePath
) {
  let content;

  try {
    content =
      fs.readFileSync(
        filePath,
        'utf8'
      );
  } catch (error) {
    return {
      readError:
        error.message,

      matches:
        []
    };
  }

  const lines =
    content.split(
      /\r?\n/
    );

  const matches =
    [];

  lines.forEach(
    (
      line,
      index
    ) => {
      const normalizedLine =
        line.toLowerCase();

      SEARCH_RULES.forEach(
        rule => {
          rule.patterns.forEach(
            pattern => {
              if (
                normalizedLine.includes(
                  pattern.toLowerCase()
                )
              ) {
                matches.push({
                  category:
                    rule.category,

                  pattern,

                  lineNumber:
                    index + 1,

                  line:
                    line.trim()
                });
              }
            }
          );
        }
      );
    }
  );

  return {
    readError:
      null,

    matches
  };
}

function createAuditReport() {
  const sourceFiles = [
    ...collectSourceFiles(
      BACKEND_SOURCE
    ),

    ...collectSourceFiles(
      FRONTEND_SOURCE
    )
  ];

  const results =
    [];

  const categoryTotals =
    {};

  for (
    const filePath of
      sourceFiles
  ) {
    const result =
      getLineMatches(
        filePath
      );

    if (
      result.readError
    ) {
      results.push({
        file:
          getRelativePath(
            filePath
          ),

        readError:
          result.readError,

        matches:
          []
      });

      continue;
    }

    if (
      result.matches.length ===
      0
    ) {
      continue;
    }

    result.matches.forEach(
      match => {
        categoryTotals[
          match.category
        ] =
          (
            categoryTotals[
              match.category
            ] ||
            0
          ) +
          1;
      }
    );

    results.push({
      file:
        getRelativePath(
          filePath
        ),

      readError:
        null,

      matches:
        result.matches
    });
  }

  const reportLines = [
    'LEGACY DEPENDENCY AUDIT',
    '=======================',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Project root: ${PROJECT_ROOT}`,
    `Files scanned: ${sourceFiles.length}`,
    `Files with matches: ${results.length}`,
    '',
    'CATEGORY SUMMARY',
    '----------------'
  ];

  const categoryEntries =
    Object.entries(
      categoryTotals
    ).sort(
      (
        firstEntry,
        secondEntry
      ) => {
        return (
          secondEntry[1] -
          firstEntry[1]
        );
      }
    );

  if (
    categoryEntries.length ===
    0
  ) {
    reportLines.push(
      'No legacy dependency references were found.'
    );
  } else {
    categoryEntries.forEach(
      (
        [
          category,
          count
        ]
      ) => {
        reportLines.push(
          `${category}: ${count}`
        );
      }
    );
  }

  reportLines.push(
    '',
    'DETAILED MATCHES',
    '----------------'
  );

  for (
    const result of
      results
  ) {
    reportLines.push(
      '',
      `FILE: ${result.file}`
    );

    if (
      result.readError
    ) {
      reportLines.push(
        `  READ ERROR: ${result.readError}`
      );

      continue;
    }

    result.matches.forEach(
      match => {
        reportLines.push(
          (
            `  [${match.category}] ` +
            `Line ${match.lineNumber}`
          )
        );

        reportLines.push(
          `    Pattern: ${match.pattern}`
        );

        reportLines.push(
          `    Code: ${match.line}`
        );
      }
    );
  }

  reportLines.push(
    '',
    'INTERPRETATION',
    '--------------',
    '',
    'Review every match before deleting old code.',
    '',
    'Safe persistent targets:',
    '  Users -> PostgreSQL',
    '  SenderAccount -> PostgreSQL',
    '  EmailTemplate -> PostgreSQL',
    '  Recipient -> PostgreSQL',
    '  SentEmail -> PostgreSQL',
    '  EmailHistory -> PostgreSQL',
    '  FollowUpTracker -> PostgreSQL',
    '  Resume metadata -> PostgreSQL',
    '  Resume physical file -> private per-user directory',
    '',
    'Runtime-only state currently remaining:',
    '  Initial scheduler state -> in-memory Map',
    '  Follow-Up batch state -> in-memory Map',
    '',
    'Do not delete a legacy route until the report confirms',
    'that no frontend or backend caller still references it.'
  );

  const report =
    reportLines.join(
      '\n'
    );

  fs.writeFileSync(
    OUTPUT_FILE,
    report,
    'utf8'
  );

  return {
    filesScanned:
      sourceFiles.length,

    filesWithMatches:
      results.length,

    categoryTotals,

    outputFile:
      OUTPUT_FILE
  };
}

try {
  const result =
    createAuditReport();

  console.log(
    '=================================='
  );

  console.log(
    'Legacy dependency audit completed'
  );

  console.log(
    'Files scanned:',
    result.filesScanned
  );

  console.log(
    'Files with matches:',
    result.filesWithMatches
  );

  console.log(
    'Report:',
    result.outputFile
  );

  console.log(
    '=================================='
  );
} catch (error) {
  console.error(
    'Legacy dependency audit failed:'
  );

  console.error(
    error.message
  );

  process.exitCode =
    1;
}