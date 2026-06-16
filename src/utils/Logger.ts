import winston from "winston";
import Transport from "winston-transport";
import path from "path";
import fs from "fs";

const LOG_DIR = path.resolve("test-logs");
const HTML_REPORT_PATH = path.resolve("test-logs", "test-report.html");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log entry interface for HTML report generation.
 */
interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
}

/**
 * In-memory collector for HTML report generation.
 */
const logEntries: LogEntry[] = [];

/**
 * Custom Winston transport that collects log entries in memory
 * for HTML report generation.
 */
class HtmlCollectorTransport extends Transport {
  private category: string;

  constructor(category: string, opts?: Transport.TransportStreamOptions) {
    super(opts);
    this.category = category;
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => this.emit("logged", info));

    logEntries.push({
      timestamp: info.timestamp || new Date().toISOString(),
      level: info.level.toUpperCase(),
      category: this.category,
      message: info.message,
    });

    callback();
  }
}

/**
 * Logger factory for Playwright tests using Winston.
 * Supports Console, File, and HTML report logging.
 *
 * Usage:
 *   import { Logger } from "./utils/Logger";
 *   const logger = Logger.getLogger("LoginTests");
 *   logger.info("Navigating to login page");
 */
export class Logger {
  private static loggers: Map<string, winston.Logger> = new Map();

  /**
   * Get a logger instance for a specific category (e.g., test name, page object).
   */
  static getLogger(category: string): winston.Logger {
    if (this.loggers.has(category)) {
      return this.loggers.get(category)!;
    }

    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "debug",
      transports: [
        // Console transport with colored output
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message }) => {
              return `${timestamp} [${level}] [${category}] - ${message}`;
            })
          ),
        }),

        // File transport (10MB max, keeps 5 rotated files)
        new winston.transports.File({
          filename: path.join(LOG_DIR, "test-execution.log"),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
            winston.format.printf(({ timestamp, level, message }) => {
              return `${timestamp} [${level.toUpperCase()}] [${category}] - ${message}`;
            })
          ),
        }),

        // Custom transport to collect entries for HTML report
        new HtmlCollectorTransport(category),
      ],
    });

    this.loggers.set(category, logger);
    return logger;
  }

  /**
   * Generate the HTML test report from collected log entries.
   * Call this in globalTeardown or at the end of your test suite.
   */
  static generateHtmlReport(
    title: string = "Playwright Test Execution Report"
  ): void {
    const stats = this.calculateStats();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; color: #333; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #1a1a2e; margin-bottom: 8px; font-size: 24px; }
        .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
        
        /* Stats Cards */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .stat-card .value { font-size: 28px; font-weight: 700; }
        .stat-card .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        .stat-total .value { color: #1a1a2e; }
        .stat-debug .value { color: #6c757d; }
        .stat-info .value { color: #0d6efd; }
        .stat-warn .value { color: #ffc107; }
        .stat-error .value { color: #dc3545; }
        .stat-verbose .value { color: #6f42c1; }
        
        /* Filter Controls */
        .controls { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .controls label { font-size: 13px; font-weight: 600; color: #555; }
        .controls input, .controls select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
        .controls input[type="text"] { width: 250px; }
        .btn-filter { padding: 6px 16px; background: #1a1a2e; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
        .btn-filter:hover { background: #2d2d4e; }
        
        /* Log Table */
        .log-table-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #1a1a2e; color: white; padding: 12px 16px; text-align: left; font-weight: 600; position: sticky; top: 0; }
        td { padding: 10px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        tr:hover { background: #f8f9fa; }
        .timestamp { color: #888; white-space: nowrap; font-family: 'Courier New', monospace; font-size: 12px; }
        .category { color: #0d6efd; font-weight: 500; white-space: nowrap; }
        .message { word-break: break-word; }
        
        /* Log Level Badges */
        .level-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .level-SILLY { background: #f0f0f0; color: #666; }
        .level-DEBUG { background: #e9ecef; color: #495057; }
        .level-VERBOSE { background: #e2d9f3; color: #432874; }
        .level-INFO { background: #cfe2ff; color: #084298; }
        .level-WARN { background: #fff3cd; color: #664d03; }
        .level-ERROR { background: #f8d7da; color: #842029; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString()} | Total Duration: ${stats.duration}</p>
        
        <div class="stats">
            <div class="stat-card stat-total"><div class="value">${stats.total}</div><div class="label">Total Logs</div></div>
            <div class="stat-card stat-debug"><div class="value">${stats.debug}</div><div class="label">Debug</div></div>
            <div class="stat-card stat-info"><div class="value">${stats.info}</div><div class="label">Info</div></div>
            <div class="stat-card stat-warn"><div class="value">${stats.warn}</div><div class="label">Warn</div></div>
            <div class="stat-card stat-error"><div class="value">${stats.error}</div><div class="label">Error</div></div>
            <div class="stat-card stat-verbose"><div class="value">${stats.verbose}</div><div class="label">Verbose</div></div>
        </div>
        
        <div class="controls">
            <label>Filter:</label>
            <input type="text" id="searchInput" placeholder="Search messages..." onkeyup="filterTable()">
            <select id="levelFilter" onchange="filterTable()">
                <option value="">All Levels</option>
                <option value="SILLY">Silly</option>
                <option value="DEBUG">Debug</option>
                <option value="VERBOSE">Verbose</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warn</option>
                <option value="ERROR">Error</option>
            </select>
            <select id="categoryFilter" onchange="filterTable()">
                <option value="">All Categories</option>
                ${[...new Set(logEntries.map((e) => e.category))].map((c) => `<option value="${c}">${c}</option>`).join("")}
            </select>
            <button class="btn-filter" onclick="clearFilters()">Clear</button>
        </div>
        
        <div class="log-table-wrapper">
            <table id="logTable">
                <thead>
                    <tr>
                        <th style="width:180px">Timestamp</th>
                        <th style="width:80px">Level</th>
                        <th style="width:150px">Category</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${logEntries
                      .map(
                        (entry) => `
                    <tr data-level="${entry.level}" data-category="${entry.category}">
                        <td class="timestamp">${new Date(entry.timestamp).toLocaleString()}</td>
                        <td><span class="level-badge level-${entry.level}">${entry.level}</span></td>
                        <td class="category">${entry.category}</td>
                        <td class="message">${this.escapeHtml(entry.message)}</td>
                    </tr>`
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        function filterTable() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const level = document.getElementById('levelFilter').value;
            const category = document.getElementById('categoryFilter').value;
            const rows = document.querySelectorAll('#logTable tbody tr');
            
            rows.forEach(row => {
                const matchLevel = !level || row.dataset.level === level;
                const matchCategory = !category || row.dataset.category === category;
                const matchSearch = !search || row.textContent.toLowerCase().includes(search);
                row.style.display = (matchLevel && matchCategory && matchSearch) ? '' : 'none';
            });
        }
        
        function clearFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('levelFilter').value = '';
            document.getElementById('categoryFilter').value = '';
            filterTable();
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(HTML_REPORT_PATH, html, "utf-8");
    console.log(`\n📊 HTML Report generated: ${HTML_REPORT_PATH}\n`);
  }

  /**
   * Flush all loggers. Call in globalTeardown.
   */
  static async shutdown(): Promise<void> {
    const closePromises = Array.from(this.loggers.values()).map(
      (logger) =>
        new Promise<void>((resolve) => {
          logger.on("finish", resolve);
          logger.end();
        })
    );
    await Promise.all(closePromises);
  }

  /** Reset log entries (useful for test isolation). */
  static clearEntries(): void {
    logEntries.length = 0;
  }

  private static calculateStats() {
    const total = logEntries.length;
    const countLevel = (lvl: string) =>
      logEntries.filter((e) => e.level === lvl).length;

    let duration = "N/A";
    if (total > 0) {
      const start = new Date(logEntries[0].timestamp).getTime();
      const end = new Date(logEntries[total - 1].timestamp).getTime();
      const diffMs = end - start;
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      duration = `${mins}m ${secs}s`;
    }

    return {
      total,
      debug: countLevel("DEBUG"),
      info: countLevel("INFO"),
      warn: countLevel("WARN"),
      error: countLevel("ERROR"),
      verbose: countLevel("VERBOSE"),
      duration,
    };
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}