const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    // Step 1: Install dependencies using npm ci
    core.info('Installing dependencies with npm ci...');
    await exec.exec('npm ci');

    // Step 2: Run npm audit and save the output to a JSON file
    core.info('Running npm audit...');
    const auditOutputPath = path.join(process.cwd(), 'audit-report.json');

    const options = {};
    options.listeners = {
      stdout: (data) => {
        fs.writeFileSync(auditOutputPath, data.toString(), { flag: 'a' });
      },
    };

    let auditFailed = false;

    try {
      await exec.exec('npm audit --json', [], options);
    } catch (error) {
      auditFailed = true;
      core.warning('npm audit found vulnerabilities. Processing the report...');
    }

    // Step 3: Parse the audit report
    if (fs.existsSync(auditOutputPath)) {
      core.info('Parsing audit report...');
      const auditReport = JSON.parse(fs.readFileSync(auditOutputPath, 'utf8'));

      if (auditReport.advisories && Object.keys(auditReport.advisories).length > 0) {
        for (const id of Object.keys(auditReport.advisories)) {
          const advisory = auditReport.advisories[id];
          const message = `Package ${advisory.module_name} has a ${advisory.severity} severity vulnerability: ${advisory.title}`;
          core.warning(message);
        }
      } else {
        core.info('No vulnerabilities found.');
      }
    } else {
      core.info('No audit report generated. Likely no vulnerabilities found.');
    }

    if (auditFailed) {
      core.warning('npm audit encountered issues, but the action has completed. Review warnings for details.');
    }

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
