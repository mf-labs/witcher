import { getIaCVar } from './data/globals.js';
import { Utils } from '../utils/utils.js';
import { GitHub } from './github.js';
import { GHAS } from './ghas.js';
import { Helper } from './helper.js';
import { Workflows } from './workflows.js';
import { PullRequest } from './pull.request.js';
import { File } from './file.js';

export class IaC extends GitHub {
    constructor(jiraTicket = 'PROJECT-123') {
        super();
        this.jiraTicket = jiraTicket;
        this.name = 'IaC';
    }

    // Overwritting parent function for specific usecase of inclusion in case of Infra Repos
    async getAllReposNamesIAC(module) {
        const repos = await this.getRepos();
        const reposName = repos.filter(function (i) {
            return i.private && !i.archived && GitHub.checkForModuleExclusion(i.name, module);
        })
        .map(function (i) {
            const name = i.name;
            return name;
        });
        return reposName;
    }

    async deploy(repo){
        const helper = new Helper();
        const res = await helper.openPR(repo, 'deploy', getIaCVar(this.jiraTicket));
        return res;
    }

    async delete(repo){
        const helper = new Helper();
        const file = new File();
        const globals = getIaCVar(this.jiraTicket);
        
        Utils.out(`Validating if iac file exists ....`);
        let res = await file.checkIfFileExists(repo, globals.CONFIG_UPLOAD_PATH);
        if(res.status != 200){
            Utils.out(`IaC config file not found. IaC is already deleted from ${repo}.`);
            return false;
        }
        
        res = await helper.openPR(repo, 'delete', globals);
        return res;
    }


    async enable(repo){
        const workflows = new Workflows();
        const globals = getIaCVar(this.jiraTicket);

        Utils.out(`Checking Workflow status`);
        const res = await workflows.status(repo, globals.CONFIG_FILE_NAME);
        if(res.status === 404 || res.data.state === 'deleted'){
            Utils.out(`Workflow does not exists. Please deploye IaC first.`);
            return res;
        }
        else if(res.data.state === 'disabled_manually') {
            Utils.out(`Enabling the workflow...`)
            let response = await workflows.enable(repo, globals.CONFIG_FILE_NAME);
            return response;
        }
        else if(res.data.state == 'active'){
            return res.data.state;
        }
    }

    async disable(repo){
        const workflows = new Workflows();
        const globals = getIaCVar(this.jiraTicket);

        Utils.out(`Checking Workflow status`);
        const res = await workflows.status(repo, globals.CONFIG_FILE_NAME);
        if(res.status === 404 || res.data.state === 'deleted'){
            Utils.out(`Workflow does not exists.`);
            return res;
        }
        else if(res.data.state === 'disabled_manually') {
            Utils.out(`Workflow is already disabled.`)
            return res;
        }
        else if(res.data.state === 'active'){
            Utils.out('Disabling workflow...');
            return await workflows.disable(repo, globals.CONFIG_FILE_NAME);
        }
    }

    async status(repo){
        const workflows = new Workflows();
        const file = new File();
        const globals = getIaCVar(this.jiraTicket);

        let res = await file.checkIfFileExists(repo, globals.CONFIG_UPLOAD_PATH);
        if(res.status === 404){
            Utils.out(`IaC configuration file does not exist.`);
            return res;
        }
        else if(res.data.name === globals.CONFIG_FILE_NAME){
            Utils.out(`IaC configuration file found: ${res.data.name}`);
            Utils.out(`Now checking status of workflow...`);

            res = await workflows.status(repo, globals.CONFIG_FILE_NAME);
            if(res.data.state === 'active'){
                return res;
            }
            else{
                Utils.out(`Workflow is disabled.`);
                return res;
            }
        }
    }

    async getIACStatusforRepors(){
        const workflows = new Workflows();
        const repoNames = await this.getAllReposNamesIAC(this.name);
        const globals = getIaCVar(this.jiraTicket);
        let isDisabled = [];
        Utils.out(`Getting IAC status for ${repoNames.length} repositories.`)
        for (let index = 0; index < repoNames.length; index++) {
            let res = await workflows.status(repoNames[index], globals.CONFIG_FILE_NAME);
            if(res.status === 200 && res.data.state != 'active'){
                isDisabled = isDisabled.concat(repoNames[index]);
            }
            else if(res.status === 404){
                isDisabled = isDisabled.concat(repoNames[index]);
            }
        }
        return isDisabled;

    }

    async massAction(action, repos){
        Utils.out(`Mass ${action} Wiz - IaC Scanning on ${repos.length} repositories`);
        for (let i = 0; i < repos.length; i++){
            await this.action(action, repos[i]);
        }
    }


    async action(action, repo) {
        if(await this.validateRepo(repo)){ return; }

        if (action === 'status' && repo.toLowerCase() === 'all') {
            Utils.out('List repositories where IaC Scanning is disabled');
            Utils.out('This will take time depending on the number of repos - grab a drink and go for a walk :)');
            Utils.out('Getting eligible repositories for IaC .....');
            let reposName = await this.getIACStatusforRepors();
            Utils.out(`Total: ${reposName.length}`);
            Utils.json(reposName);
            return reposName;
        }
        else if (action === 'status' && repo) {
            Utils.out(`Checking IaC status for ${repo} repository`);
            let res = await this.status(repo);

            if (res.status == 200) {
                Utils.info(`IaC workflow is ${res.data.state} for ${repo}`);
                return res.data.state;
            }
            else {
                Utils.err(`Couldn't get IaC status for ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'deploy' && repo) {
            Utils.out(`Deploying and enabling IaC for '${repo}' repository`);
            let res = await this.deploy(repo);

            if ((res.status === 200 || res.status === 201) && 
                (res.data.state !== 'active' && res.data.state !== 'disabled_manually' )) {
                Utils.info(`A pull request has been created to deploy and enable IaC for ${repo} repository`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                Utils.logPRInSIEM(this.name, action, repo, res.data.html_url, 'Open');
                return true;
            }
            else if(res.status === 422){
                Utils.err(`Couldn't deploy IaC on ${repo} repository`, `${res.response.data.message}`);
                return false;
            }
            else {
                if(res === 'active'){
                    Utils.err(`IaC is already deployed. Delete it to push new file.`);
                    Utils.logUpdateInSIEM(this.name, action, repo, "success");
                    return false;
                }
                else if(res.data.state === 'disabled_manually'){
                    return false;
                }
            }
        }
        else if (action === 'delete') {
            Utils.out(`Deleting IaC from '${repo}' repository`);
            let res = await this.delete(repo);

            if (res.status === 200 || res.status === 201) {
                Utils.info(`A pull request has been created to delete IaC from ${repo} repository`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                Utils.logPRInSIEM(this.name, action, repo, res.data.html_url, 'Open');
                return true;
            }
            else if(res === false){
                return false;

            }
            else {
                Utils.err(`Couldn't delete IaC from ${_repo} repository` , `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'enable') {
            Utils.out(`Enabling IaC for '${repo}' repository`);
            let res = await this.enable(repo);
            if (res.status === 204) {
                Utils.info(`IaC is now enabled for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, "success");
                return true;
            }
            else {
                if(res === 'active'){
                    Utils.err(`IaC is already enable.`);
                    return false;
                }
                Utils.err(`Couldn't enable IaC on ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'disable') {
            Utils.out(`Disabling IaC for '${repo}' repository`);
            let res = await this.disable(repo);

            if (res.status === 204) {
                Utils.info(`IaC is disabled for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, "success");
                return true;
            }
            else if(res.status !== 200){
                Utils.err(`Couldn't disable IaC ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
    }
}
