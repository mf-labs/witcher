import fs from 'fs';
import { GitHub } from "./github.js";
import { PullRequest } from './pull.request.js';
import { File } from './file.js';
import { Branch } from "./branch.js";
import { Utils } from '../utils/utils.js';

export class Helper extends GitHub {
    constructor() {
        super();
        this.file = new File();
        this.pr = new PullRequest();
        this.branch = new Branch();
    }

    async openPR(repo, action ,globals){
        // Create new branch:
        let defaultBranch = await this.branch.getDefaultBranch(repo); // get deafult branch of repo
        if(defaultBranch.status === 404){
            Utils.err(`The repo ${repo} does not exists. Please check the repo name.`);
            return;
        }

        let sha = await this.branch.getSHAOfDefaultBranch(repo, defaultBranch); // get its sha1 value
        if(action === 'deploy'){
            let createBranchResponse = await this.branch.createBranch(repo, globals.ENABLE_BRANCH_NAME , sha); // create new branch
            if(createBranchResponse.status != 201){
                Utils.err(`There was an error creating a new branch. Maybe branch name already exists?`);
                return createBranchResponse;
            }

            Utils.info(`Branch created. Name: ${globals.ENABLE_BRANCH_NAME} Now reading the content of config file from ${globals.CONFIG_FILE_LOCATION}`);
            
            // get file content
            let fileContent = fs.readFileSync(globals.CONFIG_FILE_LOCATION);
            fileContent = Buffer.from(fileContent, 'utf-8').toString('base64');
            let createFileResponse;
            let replaceFileResponse;
            let fileCheck = await this.file.checkIfFileExists(repo, globals.CONFIG_UPLOAD_PATH);
            // console.log(fileCheck);
            if(fileCheck.status === 200 || fileCheck.status === 302){
                // Replace file
                Utils.out(`Replacing content of config file to ${globals.ENABLE_BRANCH_NAME} branch.`);
                replaceFileResponse = await this.file.replaceFile(repo, globals.ENABLE_BRANCH_NAME, fileContent, globals.CONFIG_UPLOAD_PATH, globals.CREATE_FILE_COMMIT_MESSAGE); // create a new file in the branch of a repo
            }
            else {
                // upload file
                Utils.out(`Uploading content of config file to ${globals.ENABLE_BRANCH_NAME} branch.`);
                createFileResponse = await this.file.createFile(repo, globals.ENABLE_BRANCH_NAME, fileContent, globals.CONFIG_UPLOAD_PATH, globals.CREATE_FILE_COMMIT_MESSAGE); // create a new file in the branch of a repo
            }
            

            if(createFileResponse && createFileResponse.status != 201){ return createFileResponse; }
            if(replaceFileResponse && replaceFileResponse.status != 200){ return replaceFileResponse; }

            // open pull request:
            Utils.out(`Opening a pull request to push changes to default branch.`);
            let pr = await this.pr.openPullRequest(repo, globals.ENABLE_BRANCH_NAME, defaultBranch, globals.PULL_REQUEST_TITLE, globals.CREATE_FILE_COMMIT_MESSAGE); // create PR to master

            if(pr.status === 201){
                Utils.out("Commenting details of adding controls in PR");
                let res = await this.pr.issueCommentOnPR(repo, pr.data.number, globals.PULL_REQUEST_ADD_COMMENT);
            }
            return pr;
        }
        else if(action === 'delete'){
            Utils.out(`Creating a new branch...`);
            let createBranchResponse = await this.branch.createBranch(repo, globals.DISABLE_BRANCH_NAME , sha); // create new branch
            if(createBranchResponse.status != 201){
                Utils.err(`There was an error creating a new branch. Maybe branch name already exists?`);
                return createBranchResponse;
            }
            Utils.info(`Branch created. Name: ${globals.DISABLE_BRANCH_NAME}`);

            Utils.out(`Deleting config file from ${globals.DISABLE_BRANCH_NAME} branch.`)
            let deleteFileResponse = await this.file.deleteFile(repo, globals.DISABLE_BRANCH_NAME, globals.CONFIG_UPLOAD_PATH, globals.DELETE_FILE_COMMIT_MESSAGE);
            if(deleteFileResponse.status != 200){
                Utils.err(`Something went wrong while deleting the config file.`);
                return deleteFileResponse;
            }

            // open pull request:
            Utils.out(`Opening a pull request to push changes to default branch.`)
            let pull = await this.pr.openPullRequest(repo, globals.DISABLE_BRANCH_NAME, defaultBranch, globals.DELETE_PULL_REQUEST_TITLE, globals.DELETE_FILE_COMMIT_MESSAGE); // create PR to master
            
            if(pull.status == 201){
                Utils.out("Commenting details of removing controls in PR");
                let res = await this.pr.issueCommentOnPR(repo, pull.data.number, globals.PULL_REQUEST_DELETE_COMMENT);
            }
            return pull;
        }
    }

}
