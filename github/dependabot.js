import { GitHub } from './github.js';
import { Utils } from '../utils/utils.js';
import { Helper } from './helper.js';
import { getDependabotVar } from './data/globals.js';
import { File } from './file.js';

export class Dependabot extends GitHub {
    constructor(jiraTicket = 'PROJECT-123') {
        super();
        this.name = 'Dependabot';
        this.jiraTicket = jiraTicket;
        this.checkDependabotStatusUrl = 'GET /repos/{owner}/{repo}/vulnerability-alerts';
        this.enableAlertsUrl = 'PUT /repos/{owner}/{repo}/vulnerability-alerts';
        this.enableDependabotUrl = 'PUT /repos/{owner}/{repo}/automated-security-fixes';
        this.disableDependabotUrl = 'DELETE /repos/{owner}/{repo}/automated-security-fixes';
        this.disableAlertsUrl = 'DELETE /repos/{owner}/{repo}/vulnerability-alerts';
        this.checkAutomatedSecurityFixesURL = 'GET /repos/{owner}/{repo}/automated-security-fixes';
    }

    async checkAutomatedSecurityFixes(repo){
        return await this.requestGitHub(repo, this.checkAutomatedSecurityFixesURL);
    }

    // Check if automated security fixes are enabled for a repository (Dependabot)
    async getStatus(repo) {
        return await this.requestGitHub(repo, this.checkDependabotStatusUrl);
    }

    // get all repos where depedabot is disabled
    async getAllReposWhereDependabotIsDisabled() {
        const repoNames = await this.getAllReposNames(this.name);
        let reposWhereDependabotDisabled = [];
        let isEnable = [];
        let isPaused = [];
        Utils.out(`Scanning dependabot on ${repoNames.length} repositories.`);
        for (let i = 0; i < repoNames.length; i++) {
            Utils.out(`${i+1}. Scanning dependabot on '${repoNames[i]}' repository.`);
            let res = await this.getStatus(repoNames[i]);
            if (res.status != 204) {
                reposWhereDependabotDisabled = reposWhereDependabotDisabled.concat(repoNames[i]);
            }
            else if (res.status === 204 && await this.checkDepenabotYmlFile(repoNames[i])){
                reposWhereDependabotDisabled = reposWhereDependabotDisabled.concat(repoNames[i]);
            }
            else { 
                let res2 = await this.checkAutomatedSecurityFixes(repoNames[i]);

                if (res2.status == 200 && res2.data.paused === true) {
                    Utils.info(`Dependabot is Paused for '${repoNames[i]}' repository.`);
                    isPaused.push(repoNames[i]);
                }
                else {
                    isEnable.push(repoNames[i]);
                }
            }
        }
        return [reposWhereDependabotDisabled, isEnable, isPaused];
    }

    async checkDepenabotYmlFile(repoName){
        const file = new File();
        const gloabls = getDependabotVar(this.jiraTicket);
        let res = await file.checkIfFileExists(repoName, gloabls.CONFIG_UPLOAD_PATH);
        if(res.status === 404){
            return true;
        }
        return false;
    }


    async enable(repo) {
        try {
            // enable alerts:
            let res = await this.requestGitHub(repo, this.enableAlertsUrl);

            // enable dependabot:
            res = await this.requestGitHub(repo, this.enableDependabotUrl);

            return res;
        }
        catch (err) { return err; }
    }


    async disable(repo) {
        try {
            // disable alerts:
            let res = await this.requestGitHub(repo, this.disableAlertsUrl);

            // disable dependabot:
            res = await this.requestGitHub(repo, this.disableDependabotUrl);

            return res;
        }
        catch (err) { return err; }
    }

    async deploy(repo){
        try{
            await this.action('enable', repo);
            const helper = new Helper();
            let res = await helper.openPR(repo, 'deploy', getDependabotVar(this.jiraTicket));
            return res;
        }
        catch( err ){ return err; }
    }

    async delete(repo){
        try{
            await this.action('disable', repo);
            const file = new File();
            let res = await file.checkIfFileExists(repo, getDependabotVar(this.jiraTicket).CONFIG_UPLOAD_PATH);
            if(res.status != 200){
                return false;
            }
            
            const helper = new Helper();
            let response = await helper.openPR(repo, 'delete', getDependabotVar(this.jiraTicket));
            return response;
        }
        catch(err){ return err; }
    }

    async massAction(action, repos){
        Utils.out(`Mass ${action} dependabot on ${repos.length} repositories`);
        for (let i=0; i < repos.length; i++){
            await this.action(action, repos[i]);
        }
    }

    async action(action, repo) {
        if(await this.validateRepo(repo)){ return; }
        
        if (action === 'status' && repo.toLowerCase() === 'all') {
            Utils.out('Checking dependabot status on the repositories');
            let [isDisable, isEnable, isPaused] = await this.getAllReposWhereDependabotIsDisabled();
            Utils.out(`List of ${isDisable.length} repositories where dependabot is Disable`);
            Utils.json(isDisable);
            Utils.out(`List of ${isPaused.length} repositories where dependabot is Paused`);
            Utils.json(isPaused);
            Utils.out(`List of ${isEnable.length} repositories where dependabot is Enabled`);
            Utils.json(isEnable);
            return [isDisable, isPaused];
        }
        else if (action === 'status' && repo) {
            Utils.out(`Checking dependabot status for '${repo}' repository`);
            
            let res = await this.getStatus(repo);

            if (res.status == 204) {
                // Utils.info(`Dependabot enabled for '${repo}'`);
                // return true;
                let res2 = await this.checkAutomatedSecurityFixes(repo);

                if (res2.status == 200 && res2.data.paused === true) {
                    Utils.info(`Dependabot paused for '${repo}'`);
                    return false;
                }
                else if (res2.status == 200 && res2.data.paused === false) {
                    Utils.info(`Dependabot enabled for '${repo}'`);
                    return true;
                }
            }
            else if (res.status == 404 && res.response.data.message && res.response.data.message === 'Vulnerability alerts are disabled.'){
                Utils.info(`Dependabot disabled for ${repo}`);
                return false;
            }
            else {
                Utils.err(`Couldn't get dependabot status for ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'enable' && repo) {
            Utils.out(`Enabling dependabot for '${repo}' repository`);
            let res = await this.enable(repo);
            if (res.status === 204) {
                Utils.info(`Dependabot is enabled for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true;
            }
            else {
                Utils.err(`Couldn't enable dependabot ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'disable' && repo) {
            Utils.out(`Disabling dependabot for '${repo}' repository`);
            let res = await this.disable(repo);

            if (res.status === 204 || res.status === 422) {
                Utils.info(`Dependabot is disabled for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true;
            }
            else {
                Utils.err(`Couldn't disable dependabot ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'deploy' && repo) {
            Utils.out(`Deploying dependabot.yml for '${repo}' repository`);
            let res = await this.deploy(repo);
            //  201 on success
            if (res.status == 204 || res.status == 201) {
                Utils.info(`Dependabot.yml is deployed for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                Utils.logPRInSIEM(this.name, action, repo, res.data.html_url, 'Open');
                return true;
            }
            else {
                Utils.err(`Couldn't deploy dependabot.yml ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'delete' && repo) {
            Utils.out(`Deleting dependabot.yml for '${repo}' repository`);
            let res = await this.delete(repo);
            if (!res){
                Utils.info(`dependabot.yml file not found. Dependabot is already deleted from ${repo}.`);
                return true;
            }
            else if (res.status == 204 || res.status == 201) {
                Utils.info(`Dependabot.yml is deleted for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                Utils.logPRInSIEM(this.name, action, repo, res.data.html_url, 'Open');
                return true;
            }
            else {
                Utils.err(`Couldn't delete dependabot.yml ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }

    }

}