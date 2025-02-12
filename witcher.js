#!/usr/bin/env node

import { ArgumentParser } from 'argparse';
import { Utils } from './utils/utils.js';
import { Slack } from './slack/slack.js';
import { GHAS } from './github/ghas.js';
import { SecretScanning } from './github/secrets.scanning.js';
import { Dependabot } from './github/dependabot.js';
import { CodeQLAlerts } from './github/codeql.alerts.js';
import { CodeQL } from './github/codeql.js';
import { Workflows } from './github/workflows.js';
import { IaC } from './github/iac.js';


class Witcher {
  constructor() {
    this.slackPost = false;
    this.jiraPost = false;
    this.jiraTicket = null;
    this.slack = null;
    this.parser = new ArgumentParser({
      description: 'witcher ....... you can\'t escape',
    });
    this.witcherArguments();
  }

  witcherArguments() {
    this.parser.add_argument('-m', '--module', { dest: 'module', type: 'str', required: true, help: 'ghas, dependabot, secret-scanning, codeql, iac, workflows, ALL'});
    this.parser.add_argument('-a', '--action', { dest: 'action', type: 'str', required: true, help: 'enable, disbale, status, alert, deploy, delete',});
    // this.parser.add_argument('-v', '--verbose', { action:"store_true", dest: 'verbose', help: 'Print verbose output' });
    // this.parser.add_argument('-q', '--quiet', { action:"store_true", dest: 'quiet', help: 'Do not print verbose or any output' });
    this.parser.add_argument('--daily-summary', { action: 'store_true', dest: 'dailySummary', help: 'Get the Daily Summary' });
    this.parser.add_argument('--mass-action', { action: 'store_true', dest: 'massAction', help: 'Perform action (enable, deploy, delete) at scale' });
    this.parser.add_argument('--slack', { action: 'store_true', dest: 'slack', help: 'Post new alert(s) on Slack' });
    this.parser.add_argument('--siem', { action: 'store_true', dest: 'siem', help: 'Log activities on SIEM' });
    this.parser.add_argument('--jira', { action: 'store_true', dest: 'jira', help: 'Post new vulnerability ticket on Jira' });
    this.parser.add_argument('--jira-ticket', { action: 'store', dest: 'jiraTicket', help: 'Jira ticket ID (e.g. PROJECT-123)' });

    const input = this.parser.add_argument_group('Input');
    input.add_argument('--org', { dest: 'org', type: 'str', help: 'Organization Name' });
    input.add_argument('-r', '--repo', { dest: 'repo', type: 'str', help: 'Repository Name, ALL' });
    input.add_argument('-b', '--branch', { dest: 'branch', type: 'str', help: 'Branch Name' });
    input.add_argument('--workflow-file', { dest: 'workflow', type: 'str', help: 'Workflow File Name' });
    input.add_argument('--repo-file', { dest: 'repoFile', type: 'str', help: 'Repo File Name' });
  }

  async dependabot(action, repo) {
    const dependabot = new Dependabot(this.jiraTicket);
    return dependabot.action(action, repo);
  }

  async secretScanning(action, repo) {
    const secretScanning = new SecretScanning();
    return secretScanning.action(action, repo);
  }

  async ghas(action, repo) {
    const ghas = new GHAS();
    return ghas.action(action, repo);
  }

  async codeql(action, repo) {
    if (action === 'alert' && repo.toLowerCase() === 'all') {
      const codeQLAlerts = new CodeQLAlerts(this.slackPost, this.jiraPost);
      return codeQLAlerts.action(action, repo);
    }

    const codeql = new CodeQL();
    return codeql.action(action, repo);
  }

  async iac(action, repo) {
    const iac = new IaC();
    return iac.action(action, repo);
  }

  async workflows(action, repo, workflowFileName) {
    const workflows = new Workflows();
    return workflows.action(action, repo, workflowFileName);
  }

  async dailyRoutien() {
    Utils.out('Running witcher daily routine ......');
    const ghas = await this.ghas('status', 'All');
    // const dependabot = ['a', 'aa'];
    const [dependabot, isPaused] = await this.dependabot('status', 'All');
    const secret = await this.secretScanning('status', 'All');
    // const codeScanning = ['aa', 'bb'];
    const codeScanning = await this.codeql('status', 'All');
    // const iacScanning = ['bb', 'cc'];
    const iacScanning = await this.iac('status', 'All');


    Utils.out(`Daily Summary`);
    Utils.out(`======================`);
    Utils.out(`GHAS: ${ghas.length}`);
    Utils.out(`Dependabot: ${dependabot.length}`);
    Utils.out(`Paused Depenabot: ${isPaused.length}`);
    Utils.out(`Secret Scanning: ${secret.length}`);
    Utils.out(`Code Scanning: ${codeScanning.length}`);
    Utils.out(`IaC Scanning: ${iacScanning.length}`);

    if (this.slackPost){
      this.slack = new Slack();
      this.slack.sendDailySummary(ghas, secret, dependabot, isPaused, codeScanning, iacScanning);
    }
    Utils.logDailySummary(ghas, secret, dependabot, isPaused, codeScanning, iacScanning);

    // 2. Daily vulnerability scan for new vuln
    await this.codeql('alert', 'All');
  }

  async massAction(module, action, repoFile) {
    const repos = Utils.readRepoFileToList(repoFile);
    Utils.out(`Mass 'module:${action}' on '${repos.length}' repositories ....`)
    if (module === 'ALL' || module === 'ghas') {
      const ghas = new GHAS();
      await ghas.massAction(action, repos);
    }

    if (module === 'ALL' || module === 'dependabot') {
      const dependabot = new Dependabot();
      await dependabot.massAction(action, repos);
    }

    if (module === 'ALL' || module === 'secret-scanning') {
      const secretScanning = new SecretScanning();
      await secretScanning.massAction(action, repos);
    }

    if (module === 'ALL' || module === 'codeql') {
      const codeql = new CodeQL();
      await codeql.massAction(action, repos);
    }

  }
}

const runner = new Witcher();
const args = runner.parser.parse_args();

// Validate input parameters

if (args.siem) {
  Utils.logOnSIEM = true;
}

if (args.slack) {
  runner.slackPost = true;
}

if (args.jira) {
  runner.jiraPost = true;
}

if (args.action === 'deploy' || args.action === 'delete'){
  if (args.jiraTicket) {
    runner.jiraTicket = args.jiraTicket;
  }
  else {
    Utils.err('Invalid Arguments! Jira ticket ID is missing.');
    process.exit(0);
  }
}

if (args.dailySummary) {
  runner.dailyRoutien();
} 
else if (args.massAction && args.module && args.repoFile 
  && args.action && args.jiraTicket) {
  runner.massAction(args.module, args.action, args.repoFile);
} else if (args.module && args.action && args.repo) {
  if (args.module === 'ghas') { runner.ghas(args.action, args.repo); }
  else if (args.module === 'dependabot') { runner.dependabot(args.action, args.repo); }
  else if (args.module === 'secret-scanning') { runner.secretScanning(args.action, args.repo); }
  else if (args.module === 'codeql') { runner.codeql(args.action, args.repo, args.jira); }
  else if (args.module === 'iac') { runner.iac(args.action, args.repo); }
  else if (args.module === 'workflows' && args.workflow) { runner.workflows(args.action, args.repo, args.workflow); }
}
else {
  Utils.err('Invalid Arguments !!!!!');
}
