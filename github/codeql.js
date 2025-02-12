import { getCodeQLVar } from './data/globals.js';
import { Utils } from '../utils/utils.js';
import { GitHub } from './github.js';
import { GHAS } from './ghas.js';
import { Helper } from './helper.js';
import { Workflows } from './workflows.js';
import { File } from './file.js';

export class CodeQL extends GitHub {
    constructor(jiraTicket = 'PROJECT-123') {
        super();
        this.jiraTicket = jiraTicket;
        this.name = 'CodeQL';
    }

    async status(repo){
        const workflow = new Workflows();
        const file = new File();
        const globals = getCodeQLVar(this.jiraTicket);

        let response = await file.checkIfFileExists(repo, globals.CONFIG_UPLOAD_PATH);
        
        if(response.status === 404){
            return response;
        }
        else if(response.data.name === globals.CONFIG_FILE_NAME){
            Utils.out(`CodeQL.yml file found: ${response.data.name}`);
            Utils.out(`Now checking status of workflow ....`);

            response = await workflow.status(repo, globals.CONFIG_FILE_NAME);
            if(response.data.state == 'active'){
                return response;
            }
            else{
                Utils.out(`Workflow is disabled.`);
                return response;
            }
        }
    }

    async enable(repo){
        const ghas = new GHAS();
        const workflow = new Workflows();
        const globals = getCodeQLVar(this.jiraTicket);

        // make sure GHAS is enabled:
        Utils.out(`Enabling GHAS if disabled`);
        await ghas.action('enable', repo);
        
        Utils.out(`Checking Workflow status for '${repo}'`);
        const res = await workflow.status(repo, globals.CONFIG_FILE_NAME);
        if(res.status === 404 || res.data.state === 'deleted'){
            Utils.out(`Workflow does not exists. Please deploye codeql first.`);
            return res;
        }
        else if(res.data.state === 'disabled_manually') {
            Utils.out(`Enabling the workflow...`)
            let response = await workflow.enable(repo, globals.CONFIG_FILE_NAME);
            return response;
        }
        else if(res.data.state === 'active'){
            return res.data.state;
        }

    }

    async disable(repo){
        const workflow = new Workflows();
        const globals = getCodeQLVar(this.jiraTicket);

        Utils.out('Checking Workflow status');
        const res = await workflow.status(repo, globals.CONFIG_FILE_NAME);
        if(res.status === 404 || res.data.state === 'deleted'){
            Utils.out('Workflow does not exists.');
            return res;
        }
        else if(res.data.state === 'disabled_manually') {
            Utils.out('Workflow is already disabled')
            return res;
        }
        else if(res.data.state === 'active'){
            Utils.out('Disabling workflow ....');
            return await workflow.disable(repo, globals.CONFIG_FILE_NAME);
        }
    }


    async deploy(repo){
        try{
            const ghas = new GHAS();
            const helper = new Helper();

            // make sure GHAS is enabled
            Utils.out(`Enabling GHAS - If disabled`);
            await ghas.action('enable', repo);

            let res = await helper.openPR(repo, 'deploy', getCodeQLVar(this.jiraTicket));
            return res;
        }
        catch(err){ return err; }
    }


    async delete(repo){
        const helper = new Helper();
        const file = new File();
        const globals = getCodeQLVar(this.jiraTicket);

        Utils.out(`Validating if codeql file exists?`);
        let res = await file.checkIfFileExists(repo, globals.CONFIG_UPLOAD_PATH);
        if(res.status != 200){
            Utils.out(`Codeql config file not found. Codeql is already deleted from ${_repo}.`);
            return false;
        }
        
        res = await helper.openPR(repo, 'delete', globals);
        return res;
    }

    async getReposWhereCodeqlIsDisabled(){
        const workflow = new Workflows(this.token);
        const repoNames = await this.getAllReposNames(this.name);
        const globals = getCodeQLVar(this.jiraTicket);

        let isDisabled = [];
        let isDeployed = [];
        Utils.out(`Checking ${repoNames.length} eligible repository for codeql status!`);
        for (let i = 0; i < repoNames.length; i++) {
            Utils.out(`${i+1}. Scanning CodeQL on '${repoNames[i]}' repository.`);
            let res = await workflow.status(repoNames[i], globals.CONFIG_FILE_NAME);
            if(res.status == 200 && res.data.state != 'active'){
                isDisabled = isDisabled.concat(repoNames[i]);
            }
            else if(res.status == 404){
                isDisabled = isDisabled.concat(repoNames[i]);
            }
            else {
                isDeployed = isDeployed.concat(repoNames[i]);
            }
        }
        return {'isDisabled':isDisabled, 'isDeployed':isDeployed};
    }


    async massAction(action, repos){
        Utils.out(`Mass ${action} CodeQL on ${repos.length} repositories`);
        for(let i=0; i< repos.length; i++){
            await this.action(action, repos[i]);
        }
    }

    
    async action(action, repo) {
        if (await this.validateRepo(repo)){ return; }

        if (action === 'status' && repo.toLowerCase() === 'all') {
            Utils.out('List repositories where Code Scanning is disabled');
            Utils.out('This will take time depending on the number of repos - grab a drink and go for a walk :)');
            const {isDisabled, isDeployed} = await this.getReposWhereCodeqlIsDisabled();
            Utils.out(`Total: ${isDisabled.length}`);
            Utils.json(isDisabled);
            Utils.out(`${isDeployed.length} repositories where CodeQL is deployed`);
            Utils.json(isDeployed);
            return isDisabled;
        }
        else if (action === 'status' && repo) {
            Utils.out(`Checking CodeQL status for '${repo}' repository`);
            let res = await this.status(repo);
            if (res.status == 404){
                Utils.out(`CodeQL.yml file does not exist.`);
                Utils.out(`CodeQL is disabled for ${repo}`);
                return false;
            }
            else if (res.status == 200) {
                Utils.info(`CodeQL workflow is ${res.data.state} for ${repo}`);
                return res.data.state;
            }
            else {
                Utils.err(`Couldn't get CodeQL status for ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'deploy') {
            Utils.out(`Deploying and enabling CodeQL for '${repo}' repository`);
            let res = await this.deploy(repo);
            
            if (res.status == 200 || res.status == 201) {
                Utils.info(`A pull request has been created to deploy and enable codeql for '${repo}' repository`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                Utils.logPRInSIEM(this.name, action, repo, res.data.html_url, 'Open');
                return true;
            }
            else if(res.status == 422){
                Utils.err(`Couldn't deploy CodeQL on ${repo} repository`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'delete' && repo) {
            Utils.out(`Deleting CodeQL from '${repo}' repository`);
            let res = await this.delete(repo);

            if (res.status == 200 || res.status == 201) {
                Utils.info(`A pull request has been created to delete codeql from ${repo} repository`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                Utils.logPRInSIEM(this.name, action, repo, res.data.html_url, 'Open');
                return true;
            }
            else {
                Utils.err(`Couldn't delete CodeQL from ${repo} repository` , `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'enable' && repo) {
            Utils.out(`Enabling CodeQL for ${repo} repository`);
            let res = await this.enable(repo);
            if (res.status == 204) {
                Utils.info(`CodeQL is now enabled for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true;
            }
            else {
                if(res === 'active'){
                    Utils.err(`CodeQL is already enable.`);
                    return false;
                }
                Utils.err(`Couldn't enable CodeQL on ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'disable' && repo) {
            Utils.out(`Disabling CodeQL for '${repo}' repository`);
            let res = await this.disable(repo);
            if (res.status == 204) {
                Utils.info(`CodeQL is disabled for ${repo}`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true;
            }
            else if(res.status != 200){
                Utils.err(`Couldn't disable CodeQL ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
    }
}
