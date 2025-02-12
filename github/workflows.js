import { GitHub } from "./github.js";
import { Utils } from "../utils/utils.js";


export class Workflows extends GitHub {
    constructor() {
        super();
        this.name = "Workflows";

        this.getWorkflowUrl = 'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}' // in place of 'workflow_id' we can provide workflow filename.
        this.enableWorkflowUrl = 'PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable';
        this.disableWorkflowUrl = 'PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable'
    }

    // check if workflow is enabled or disabled on a repo
    async status(repoName, workflowFileName) {
        try {
            let response = await this.octokit.request(this.getWorkflowUrl, {
                owner: this.org,
                repo: repoName,
                workflow_id: workflowFileName,
                headers: this.headers
            });
            return response; // _response.data.state will contain the status value
        }
        catch (err) { return err; }
    }

    // Enable workflow on a repo
    async enable(repo, workflowFileName) {
        try {
            let res = await this.octokit.request(this.enableWorkflowUrl, {
                owner: this.org,
                repo: repo,
                workflow_id: workflowFileName,
                headers: this.headers
            });
            return res; // status code of 204
        }
        catch (err) { return err; }
    }

    // Disble workflow on a repo
    async disable(repo, workflowFileName) {
        try {
            let res = await this.octokit.request(this.disableWorkflowUrl, {
                owner: this.org,
                repo: repo,
                workflow_id: workflowFileName,
                headers: this.headers
            });
            return res;
        }
        catch (err) { return err; }
    }


    async massAction(action, repos){
        Utils.out(`Mass ${action} workflow on ${repos.length} repositories`);
        for(let i=0; i< repos.length; i++){
            await this.action(action, repos[i]);
        }
    }

    // workflow action from witcher
    async action(action, repo, workflowFileName) {
        if(await this.validateRepo(repo)){ return; }
        
        if (action === 'status') {
            Utils.out(`Checking workflow status for '${repo}' repository`);
            let res = await this.status(repo, workflowFileName);
            if (res.status === 200) {
                Utils.info(`workflow ${res.data.state} for ${repo}`);
                return res.data.state;
            }
            else {
                Utils.err(`Couldn't get workflow status for ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'enable') {
            Utils.out(`Enabling workflow for '${repo}' repository`);
            let res = await this.enable(repo, workflowFileName);
            if (res.status == 200 || res.status == 204) {
                Utils.info(`workflow is enabled for ${repo}`);
                return true;
            }
            else {
                Utils.err(`Couldn't enable workflow ${repo}`, `${res.response.data.message}`);
                return false;
            }

        }
        else if (action === 'disable') {
            Utils.out(`Disabling workflow for '${repo}' repository`);
            let res = await this.disable(repo, workflowFileName);
            if (res.status == 200 || res.status == 204) {
                Utils.info(`workflow is disabled for ${repo}`);
                return true;
            }
            else {
                Utils.err(`Couldn't disable workflow ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
    }
}