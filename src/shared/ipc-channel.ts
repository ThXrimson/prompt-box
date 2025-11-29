export enum IpcChannels {
    // get
    GetAllPrompts = 'get-all-prompts',
    GetAllWorkspaces = 'get-all-workspaces',
    GetAllExamples = 'get-all-examples',
    GetAllImages = 'get-all-images',
    GetAllTags = 'get-all-tags',
    // create
    CreatePrompts = 'create-prompts',
    CreateWorkspaces = 'create-workspaces',
    CreateExamples = 'create-examples',
    CreateImages = 'create-images',
    CreateTags = 'create-tags',
    // update
    UpdatePrompts = 'update-prompts',
    UpdateWorkspaces = 'update-workspaces',
    UpdateExamples = 'update-examples',
    UpdateImages = 'update-images',
    UpdateTags = 'update-tags',
    // delete
    DeletePrompts = 'delete-prompts',
    DeleteWorkspaces = 'delete-workspaces',
    DeleteExamples = 'delete-examples',
    DeleteImages = 'delete-images',
    DeleteTags = 'delete-tags',
    // notify
    NotifyPrompts = 'notify-prompts',
    NotifyWorkspaces = 'notify-workspaces',
    NotifyExamples = 'notify-examples',
    NotifyImages = 'notify-images',
    NotifyTags = 'notify-tags',
}
