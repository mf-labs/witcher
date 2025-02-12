import { GitHub } from './github.js';
import { Slack } from '../slack/slack.js';
import { Utils } from '../utils/utils.js';
import { Jira } from '../jira/jira.js';

export class CodeQLAlerts extends GitHub {
    constructor(slackPost = false, jiraPost = false, toolName = 'codeql') {
        super();
        this.toolName = toolName;
        this.slack = new Slack();
        this.jira = new Jira(this);
        this.jiraPost = jiraPost;
        this.slackPost = slackPost;
        this.newAlertCount = 0;
        this.today = new Date();
        this.dayDiff = 1;
        this.yesterday = new Date(new Date().setDate(new Date().getDate() - this.dayDiff));

        this.getCodeqlAlertsUrl = 'GET /orgs/{org}/code-scanning/alerts?per_page={per_page}&sort={sort}&tool_name={tool_name}&severity={severity}&state={state}';
        this.getCodeqlAlertsForRepoUrl = 'GET /repos/{owner}/{repo}/code-scanning/alerts';
        this.updateCodescanningAlertUrl = 'PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}';
        this.getCodeScanningAlertUrl = 'GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}';
    }


    async getAlerts(page) {
        try {
            const res = await this.octokit.request(this.getCodeqlAlertsUrl, {
                org: this.org,
                tool_name: this.toolName,
                direction: 'desc',
                severity: 'critical,high',
                sort: 'created',
                state: 'open',
                per_page: 20,
                page: page,
                headers: this.headers,
            });
            return res;
        }
        catch (err) { return err; }
    }


    async getAlertsForRepo(repo) {
        try{
            const res = await this.octokit.request(this.getCodeqlAlertsForRepoUrl, {
                owner: this.org,
                state: 'open',
                repo: repo,
                headers: this.headers,
            });
            return res;
        }
        catch (err) { return err; }
    }


    async updateCodeScanningAlert(repo, alertNo, state, reason, comment){
        try {
            const res = await this.octokit.request(this.updateCodescanningAlertUrl, {
                owner: this.org,
                repo: repo,
                alert_number: alertNo,
                state: state,
                dismissed_reason: reason,
                dismissed_comment: comment,
                headers: this.headers,
            });
            return res;
        }
        catch(err) { return err; }
    }


    async getCodeScanningAlert(repo, number) {
        try {
            const res = await this.octokit.request(this.getCodeScanningAlertUrl, {
                owner: this.org,
                repo: repo,
                alert_number: number,
                headers: this.headers,
            });
            return res;
        }
        catch (err) { return err; }
    }


    async parseCodeSacnningAlerts(alerts){
        Utils.out(`Today date is :: ${this.today.toString()}`);
        Utils.out(`Yesterday date is :: ${this.yesterday.toString()}`);
        alerts.forEach((alert) => {
            if (new Date(alert.created_at) > this.yesterday) {
                this.newAlertCount = 1 + this.newAlertCount;
                Utils.info(`New Alert Number: ${alert.number}`);
                if (this.jiraPost) { 
                    (async () => {
                        Utils.info(`Creating jira ticket for alert no. ${alert.number}`);
                        let res = await this.jira.createVulnTicket(alert);
                        await this.slack.sendVulnAlert(alert, res.key);
                    })();
                }
            }
            else {
                Utils.out(`Old --- Alert Number ${alert.number}`);
            }
        });

        if (this.newAlertCount > 0){
            Utils.info(`${this.newAlertCount} new alert(s) have been generated in ${this.dayDiff} days.`)
        }
    }

    async action(action, repo){
        if (action === 'alert' && repo.toLowerCase() === 'all'){
            Utils.out('Getting codeQL scanning alerts (page 1) ....');
            let res = await this.getAlerts(1);
            let alerts = res.data;

            for(let i = 2; res.data.length !== 0 ; i++) {
                Utils.out(`Getting codeQL scanning alerts (page ${i}) ....`);
                res = await this.getAlerts(i);
                alerts = alerts.concat(res.data);
            }
            Utils.out(`Total CodeQL fetched alerts :: ${alerts.length}`);
            if(alerts.length === 0) {
                Utils.info('No new alert :) another happy day');
                return;
            }
            // fs.writeFileSync('test.json', JSON.stringify(_alerts['data']));
            Utils.out('Parsing fetched alerts ....');
            await this.parseCodeSacnningAlerts(alerts);
        }
    }
}
