import { Version3Client } from 'jira.js';
import { Utils } from '../utils/utils.js';

export class Jira {
    constructor(CodeQLAlerts) {
        this.client = null;
        this.CodeQLAlerts = CodeQLAlerts;
        this.host = process.env.JIRA_URL;
        this.email = process.env.JIRA_EMAIL;
        this.apiToken = process.env.JIRA_API_TOKEN;
        this.project = process.env.JIRA_PROJECT;
        this.type = process.env.JIRA_ISSUE_TYPE;
        this.authenticate();
    }

    async authenticate() {
        try{
            this.client = new Version3Client({
                host: this.host,
                authentication: {
                    basic: {
                    email: this.email,
                    apiToken: this.apiToken,
                    },
                },
            });
            Utils.out('Jira Authenticated !!!');
        }
        catch(err) { return err; }
    }

    async getProjectObject(){
        return this.client.projects.getProject(this.project);
    }

    async createVulnTicket(alert){
        try {
            await this.authenticate();
            this.project = await this.getProjectObject();
            const res = await this.CodeQLAlerts.getCodeScanningAlert(alert.repository.name, alert.number);
            const res2 = await this.client.issues.createIssue({
                fields: {
                    summary: `[${alert.repository.name}] ${alert.most_recent_instance.message.text}`,
                    issuetype: {
                        name: this.type,
                    },
                    description: `${res.data.rule.full_description}\n\n${res.data.rule.help}\n\nClass Path: ${alert.most_recent_instance.location.path}\n\nMore Information and Fix can be found here. ${alert.html_url}`,
                    customfield_10366: {
                        value: 'Scanner',
                    },
                    customfield_10333: {
                        value: `${alert.rule.security_severity_level}`.replace(/\b[a-z]/g, (x) => x.toUpperCase()),
                    },
                    labels: ['codeql', 'scanning', 'witcher'],
                    project: {
                        key: this.project.key,
                    },
                }
            });
            Utils.info(`Jira Issue created ${res2.self}`);
            return res2;
        }
        catch (err) {
            return err;
        }
    }
}
