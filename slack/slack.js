import App from '@slack/bolt';
import fs from 'fs';


export class Slack {

    constructor(){
        this.token = process.env.SLACK_BOT_TOKEN;
        this.signingSecret = process.env.SLACK_SIGNING_SECRET;
        this.channel = process.env.SLACK_CHANNEL;
        this.org = process.env.ORG;

        this.app = new App.App({
            signingSecret: process.env.SLACK_SIGNING_SECRET,
            token: process.env.SLACK_BOT_TOKEN,
        });
    }

    async sendMessage(blocks){
        await this.app.client.chat.postMessage({
            channel: this.channel,
            text:"witcher -> something is coming",
            blocks: blocks,
        });
    }



    async sendVulnAlert(vuln, vulnKey){
        let content = fs.readFileSync('./slack/templates/vuln.json').toString();
        const repoName = vuln.repository.full_name;
        const security_severity_level = vuln.rule.security_severity_level;
        const description = vuln.most_recent_instance.message.text;
        const htmlUrl = vuln.html_url;
        const classPath = vuln.most_recent_instance.location.path;
        const jiraLink = `https://${this.org}.atlassian.net/browse/${vulnKey}`;

        content = content.replace("${repo_name}", repoName);
        content = content.replace("${security_severity_level}", security_severity_level);
        content = content.replace("${description}", description);
        content = content.replace("${html_url}", htmlUrl);
        content = content.replace("${jira_url}", jiraLink);
        content = content.replace("${class_path}", classPath);
        
        // console.log(content);
        await this.sendMessage(content);
    }


    async sendDailySummary(ghas, secret, dependabot, isPaused, codeScanning, iacScanning){
        let content = fs.readFileSync('./slack/templates/summary.json').toString();

        // GHAS Results
        if (ghas.length === 0) {
            content = content.replace('${{ghas_total}}', 'GHAS is enabled on all');
            content = content.replace('${{ghas_repos}}', '');
        }
        else if (ghas.length >= 10) {
            content = content.replace("${{ghas_total}}", `GHAS is not enabled on ${ghas.length}`);
            content = content.replace("${{ghas_repos}}", '```' + `${ghas.length} repositories !!!` + '```');
        }
        else{
            content = content.replace("${{ghas_total}}", `GHAS is not enabled on ${ghas.length}`);
            content = content.replace("${{ghas_repos}}", "```" + JSON.stringify(ghas, null, 4).replaceAll("\"","'") + "```");    
        }

        // Secret Scanning
        if (secret.length === 0){
            content = content.replace("${{secret_total}}", 'Secret Scanning is enabled on all');
            content = content.replace("${{secret_repos}}", '');
        }
        else if (secret.length >= 10) {
            content = content.replace("${{secret_total}}", `Secret Scanning is not enabled on ${secret.length}`);
            content = content.replace("${{secret_repos}}", '```' + `${secret.length} repositories !!!` + '```');
        }
        else {
            content = content.replace("${{secret_total}}", `Secret Scanning is not enabled on ${secret.length}`);
            content = content.replace("${{secret_repos}}", "```" + JSON.stringify(secret, null, 4).replaceAll("\"","'") + "```");    
        }

        // Dependabot Sccanning Results
        if (dependabot.length === 0){
            content = content.replace("${{dp_total}}", 'Dependabot is enabled on all');
            content = content.replace("${{dp_repos}}", '');
        }
        else if (dependabot.length >= 10) {
            content = content.replace("${{dp_total}}", `Dependabot is not enabled on ${dependabot.length}`);
            content = content.replace("${{dp_repos}}", '```' + `${dependabot.length} repositories !!!` + '```');
        }
        else{
            content = content.replace("${{dp_total}}", `Dependabot is not enabled on ${dependabot.length}`);
            content = content.replace("${{dp_repos}}", '```' + JSON.stringify(dependabot, null, 4).replaceAll("\"","'") + '```');    
        }

        // Dependabot Sccanning Results
        if (isPaused.length === 0){
            content = content.replace("${{paused_total}}", 'Dependabot is not Paused on any repository.');
            content = content.replace("${{paused_repos}}", '');
        }
        else if (isPaused.length >= 10) {
            content = content.replace("${{paused_total}}", `Dependabot is paused on ${isPaused.length}`);
            content = content.replace("${{paused_repos}}", '```' + `${isPaused.length} repositories !!!` + '```');
        }
        else{
            content = content.replace("${{paused_total}}", `Dependabot is paused on ${isPaused.length}`);
            content = content.replace("${{paused_repos}}", '```' + JSON.stringify(isPaused, null, 4).replaceAll("\"","'") + '```');    
        }

        // Code Scanning Results
        if (codeScanning.length === 0) {
            content = content.replace("${{code_total}}", 'CodeQL is enabled on all');
            content = content.replace("${{code_repos}}", '');
        }
        else if (codeScanning.length >= 10) {
            content = content.replace("${{code_total}}", `CodeQL is not enabled on ${codeScanning.length}`);
            content = content.replace("${{code_repos}}", '```' + `${codeScanning.length} repositories !!!` + '```');
        }
        else {
            content = content.replace("${{code_total}}", `CodeQL is not enabled on ${codeScanning.length}`);
            content = content.replace("${{code_repos}}", '```' + JSON.stringify(codeScanning, null, 4).replaceAll("\"","'") + '```');    
        }

        // IaC Scanning results
        if (iacScanning.length === 0) {
            content = content.replace("${{iac_total}}", 'IaC Scanning is enabled on all');
            content = content.replace("${{iac_repos}}", '');
        }
        else if (iacScanning.length >= 10){
            content = content.replace("${{iac_total}}", `IaC Scanning is not enabled on ${iacScanning.length}`);
            content = content.replace("${{iac_repos}}", '```' + `${iacScanning.length} repositories !!!` + '```');
        }
        else {
            content = content.replace("${{iac_total}}", `IaC Scanning is not enabled on ${iacScanning.length}`);
            content = content.replace("${{iac_repos}}", '```' + JSON.stringify(iacScanning, null, 4).replaceAll("\"","'") + '```');
        }
        
        // console.log(content);
        await this.sendMessage(content);
    }
}


