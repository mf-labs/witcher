export function getIaCVar(jiraTicket){
    return {
        PULL_REQUEST_TITLE: `ci: [${jiraTicket}] adding IaC support`,
        DELETE_PULL_REQUEST_TITLE: `ci: [${jiraTicket}] removing IaC support`,
        ENABLE_BRANCH_NAME: `${jiraTicket}-ci-adding-IaC-support`,
        DISABLE_BRANCH_NAME: `${jiraTicket}-ci-removing-IaC-support`,
        CONFIG_UPLOAD_PATH: '.github/workflows/iac.yml',
        CONFIG_FILE_NAME: 'iac.yml',
        CONFIG_FILE_LOCATION: './dotgithub/iac.yml',
        CREATE_FILE_COMMIT_MESSAGE: `ci: [${jiraTicket}] adding IaC support`,
        PULL_REQUEST_ADD_COMMENT: `Comment`,
        DELETE_FILE_COMMIT_MESSAGE: `ci: [${jiraTicket}] removing IaC support`,
        PULL_REQUEST_DELETE_COMMENT: 'Comment',
    }
}

export function getDependabotVar(jiraTicket){
    return {
        PULL_REQUEST_TITLE: `ci: [${jiraTicket}] adding dependabot support`,
        DELETE_PULL_REQUEST_TITLE: `ci: [${jiraTicket}] removing dependabot support`,
        ENABLE_BRANCH_NAME: `${jiraTicket}-ci-adding-dependabot-support`,
        DISABLE_BRANCH_NAME: `${jiraTicket}-ci-removing-dependabot-support`,
        CONFIG_UPLOAD_PATH: '.github/dependabot.yml',
        CONFIG_FILE_NAME: 'dependabot.yml',
        CONFIG_FILE_LOCATION: './dotgithub/dependabot.yml',
        CREATE_FILE_COMMIT_MESSAGE: `ci: [${jiraTicket}] adding dependabot support`,
        PULL_REQUEST_ADD_COMMENT: `Comment`,
        DELETE_FILE_COMMIT_MESSAGE: `ci: [${jiraTicket}] removing dependabot support`,
        PULL_REQUEST_DELETE_COMMENT: 'Comment',
    };
}

export function getCodeQLVar(jiraTicket){
    return {
        PULL_REQUEST_TITLE: `ci: [${jiraTicket}] adding codeql support`,
        DELETE_PULL_REQUEST_TITLE: `ci: [${jiraTicket}] removing codeql support`,
        ENABLE_BRANCH_NAME: `${jiraTicket}-ci-adding-CodeQL-support`,
        DISABLE_BRANCH_NAME: `${jiraTicket}-ci-removing-CodeQL-support`,
        CONFIG_UPLOAD_PATH: '.github/workflows/codeql.yml',
        CONFIG_FILE_NAME: 'codeql.yml',
        CONFIG_FILE_LOCATION: './dotgithub/codeql.yml',
        CREATE_FILE_COMMIT_MESSAGE: `ci: [${jiraTicket}] adding codeql support`,
        PULL_REQUEST_ADD_COMMENT: `Comment`,
        DELETE_FILE_COMMIT_MESSAGE: `ci: [${jiraTicket}] removing codeql support`,
        PULL_REQUEST_DELETE_COMMENT: 'Comment',
    };
}

