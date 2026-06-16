import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for InstrumentsPageSelfHealing.
 *
 * Contains only pure data (selector strings + semantic metadata).
 * No Playwright Page dependency — safe to import anywhere.
 */
export const instrumentsLocators = {

    activateInstrumentButton: {
        selector: '[data-testid="activate-instrument-button"]',
        metadata: {
            role: 'button',
            name: 'Activate',
            description: 'Activate instrument button to reactivate a deactivated instrument',
        },
    },

    activatedInstrument: {
        selector: '[data-testid="activated-instrument"]',
        metadata: {
            description: 'Activated instrument entry visible in the instrument dropdown after reactivation',
        },
    },

    addRuleButton: {
        selector: '[data-testid="add-rule"]',
        metadata: {
            role: 'button',
            name: 'Add rule',
            description: 'Add rule button on the instrument create/edit form',
        },
    },

    addRuleButtonByRole: {
        selector: 'role=button[name="Add rule"]',
        metadata: {
            role: 'button',
            name: 'Add rule',
            description: 'Add rule button located by role on the instrument edit form',
        },
    },

    addRuleForm: {
        selector: '[data-testid="add-rule-form"]',
        metadata: {
            description: 'Add rule form on the instrument edit page',
        },
    },

    additionalInfoTitle: {
        selector: '[data-testid="additional-info-title"]',
        metadata: {
            description: 'Additional information section title on the edit instrument page',
        },
    },

    anotherTable: {
        selector: '[data-testid="another-table"]',
        metadata: {
            role: 'table',
            description: 'Additional table element on the Instruments page',
        },
    },

    auditLogEntry: {
        selector: '[data-testid="audit-log-entry"]',
        metadata: {
            description: 'An audit log entry row in the audit trail table',
        },
    },

    auditTrailLink: {
        selector: '[data-testid="audit-trail"]',
        metadata: {
            description: 'Audit trail navigation link on the instruments page',
        },
    },

    auditTrailPage: {
        selector: '[data-testid="audit-trail-page"]',
        metadata: {
            description: 'Audit trail page container',
        },
    },

    auditTrailTab: {
        selector: '[data-testid="audit-trail-tab"]',
        metadata: {
            role: 'tab',
            name: 'Audit Trail',
            description: 'Audit Trail navigation tab accessible from the Instruments area',
        },
    },

    basicInfoForm: {
        selector: '[data-testid="basic-info-form"]',
        metadata: {
            description: 'Basic info form on the create LS page',
        },
    },

    basicInfoTitle: {
        selector: '[data-testid="basic-info-title"]',
        metadata: {
            description: 'Basic information section title on the edit instrument page',
        },
    },

    breadcrumb: {
        selector: '[data-testid="breadcrumb"]',
        metadata: {
            description: 'Breadcrumb navigation on instrument detail/form pages',
        },
    },

    compatibilityTitle: {
        selector: '[data-testid="compatibility-title"]',
        metadata: {
            description: 'Compatibility section title on the edit instrument page',
        },
    },

    confirmDeactivation: {
        selector: '[data-testid="confirm-deactivation"]',
        metadata: {
            role: 'button',
            name: 'Confirm',
            description: 'Confirm deactivation button in the deactivation confirmation dialog',
        },
    },

    confirmDeactivationButton: {
        selector: '[data-testid="confirm-deactivation-button"]',
        metadata: {
            role: 'button',
            name: 'Confirm',
            description: 'Confirm deactivation button (alternative selector) in confirmation dialog',
        },
    },

    confirmationMessage: {
        selector: '[data-testid="confirmation-message"]',
        metadata: {
            role: 'dialog',
            description: 'Confirmation dialog shown before deactivating an instrument',
        },
    },

    coolingTemperatureError: {
        selector: '[data-testid="cooling-temperature-error"]',
        metadata: {
            description: 'Cooling temperature validation error message on the edit instrument form',
        },
    },

    coolingTemperatureOption: {
        selector: '[data-testid="cooling-temperature-option"]',
        metadata: {
            description: 'Cooling temperature rule option on the instrument create/edit form',
        },
    },

    createButton: {
        selector: '[data-testid="create-button"]',
        metadata: {
            role: 'button',
            description: 'Create button on the basic info form for LS creation',
        },
    },

    createInstrumentPage: {
        selector: '[data-testid="create-new-instrument-page"]',
        metadata: {
            description: 'Create new instrument form page container',
        },
    },

    createLsButton: {
        selector: '[data-testid="create-ls-button"]',
        metadata: {
            role: 'button',
            description: 'Create LS button on the library management page',
        },
    },

    createNewButtonByRole: {
        selector: 'role=button[name="Create new instrument"]',
        metadata: {
            role: 'button',
            name: 'Create new instrument',
            description: 'Create new instrument button located by role on the instruments page',
        },
    },

    createNewInstrument: {
        selector: '[data-testid="create-new-instrument"]',
        metadata: {
            role: 'button',
            name: '+ Create New Instrument',
            description: 'Create new instrument link/button navigating to the add form',
        },
    },

    createNewInstrumentButton: {
        selector: '[data-testid="create-new-instrument-button"]',
        metadata: {
            role: 'button',
            name: '+ Create New Instrument',
            text: '+ Create New Instrument',
            description: 'Create new instrument button on the Instruments list page',
        },
    },

    deactivateButton: {
        selector: '[data-testid="deactivate-button"]',
        metadata: {
            role: 'button',
            description: 'Deactivate button within an instrument row',
        },
    },

    deactivateInstrumentButton: {
        selector: '[data-testid="deactivate-instrument-button"]',
        metadata: {
            role: 'button',
            name: 'Deactivate',
            description: 'Deactivate instrument button on the Instruments page',
        },
    },

    deactivatedInstrument: {
        selector: '[data-testid="deactivated-instrument"]',
        metadata: {
            description: 'Deactivated instrument entry in the instrument dropdown',
        },
    },

    editInstrumentButton: {
        selector: '[data-testid="edit-instrument-button"]',
        metadata: {
            role: 'button',
            name: 'Edit',
            description: 'Edit instrument action button in the instruments table row',
        },
    },

    editInstrumentPage: {
        selector: '[data-testid="edit-instrument-page"]',
        metadata: {
            description: 'Edit instrument form page container',
        },
    },

    emptyState: {
        selector: '[data-testid="empty-state"]',
        metadata: {
            description: 'Empty state text element (e.g. "No rules defined yet") on the edit instrument page',
        },
    },

    filterDropdown: {
        selector: '[data-testid="filter-dropdown"]',
        metadata: {
            role: 'combobox',
            description: 'Filter dropdown on the Instruments page',
        },
    },

    filterInactive: {
        selector: '[data-testid="filter-inactive"]',
        metadata: {
            description: 'Filter option to show inactive/deactivated instruments',
        },
    },

    headingCreateNewInstrument: {
        selector: 'role=heading[name="Create New Instrument"]',
        metadata: {
            role: 'heading',
            name: 'Create New Instrument',
            description: 'Create New Instrument page heading',
        },
    },

    headingInstruments: {
        selector: 'role=heading[name="Instruments"]',
        metadata: {
            role: 'heading',
            name: 'Instruments',
            description: 'Instruments page heading located by role',
        },
    },

    heatingTemperatureOption: {
        selector: '[data-testid="heating-temperature-option"]',
        metadata: {
            description: 'Heating temperature rule option on the instrument create/edit form',
        },
    },

    inactiveInstrument: {
        selector: '[data-testid="inactive-instrument"]',
        metadata: {
            description: 'Inactive instrument entry visible after applying inactive filter',
        },
    },

    incompatibleReagents: {
        selector: '[data-testid="incompatible-reagents"]',
        metadata: {
            description: 'Incompatible reagents field on the edit instrument page',
        },
    },

    incompatibleSolvents: {
        selector: '[data-testid="incompatible-solvents"]',
        metadata: {
            description: 'Incompatible solvents field on the edit instrument page',
        },
    },

    instrumentDescriptionInput: {
        selector: '[data-testid="instrument-description"]',
        metadata: {
            role: 'textbox',
            description: 'Instrument description input field on the Create instrument form',
        },
    },

    instrumentDescriptionInputEdit: {
        selector: '[data-testid="instrument-description-input"]',
        metadata: {
            role: 'textbox',
            description: 'Instrument description input field on the Edit instrument form',
        },
    },

    instrumentDropdown: {
        selector: '[data-testid="instrument-dropdown"]',
        metadata: {
            role: 'combobox',
            description: 'Instrument selection dropdown on the LS automation settings step',
        },
    },

    instrumentNameInput: {
        selector: '[data-testid="instrument-name"]',
        metadata: {
            role: 'textbox',
            label: 'Instrument Name*',
            placeholder: 'Enter instrument Name',
            description: 'Instrument name input field on the Create/Edit instrument form',
        },
    },

    instrumentNameInputEdit: {
        selector: '[data-testid="instrument-name-input"]',
        metadata: {
            role: 'textbox',
            description: 'Instrument name input field on the Edit instrument form',
        },
    },

    instrumentRow: {
        selector: '[data-testid="instrument-row"]',
        metadata: {
            role: 'row',
            description: 'An instrument row in the instruments table',
        },
    },

    instrumentTypeInput: {
        selector: '[data-testid="instrument-type"]',
        metadata: {
            role: 'textbox',
            description: 'Instrument type input field on the Create instrument form',
        },
    },

    instrumentTypeInputEdit: {
        selector: '[data-testid="instrument-type-input"]',
        metadata: {
            role: 'textbox',
            description: 'Instrument type input field on the Edit instrument form',
        },
    },

    instrumentsList: {
        selector: '[data-testid="instruments-list"]',
        metadata: {
            description: 'Instruments list container visible after saving a new instrument',
        },
    },

    instrumentsListPage: {
        selector: '[data-testid="instruments-list-page"]',
        metadata: {
            description: 'Instruments list page container visible after updating an instrument',
        },
    },

    instrumentsPage: {
        selector: '[data-testid="instruments-page"]',
        metadata: {
            description: 'Instruments page root container',
        },
    },

    instrumentsTab: {
        selector: '[data-testid="instruments-tab"]',
        metadata: {
            role: 'tab',
            name: 'Instruments',
            description: 'Instruments navigation tab in the side menu or tab bar',
        },
    },

    instrumentsTable: {
        selector: '[data-testid="instruments-table"]',
        metadata: {
            role: 'table',
            description: 'Instruments data table listing all registered instruments',
        },
    },

    instrumentsTableRows: {
        selector: '[data-testid="instruments-table"] tr',
        metadata: {
            role: 'row',
            description: 'Table rows within the instruments data table',
        },
    },

    labelIncompatibleReagents: {
        selector: 'role=textbox[name="Incompatible Reagents"]',
        metadata: {
            role: 'textbox',
            label: 'Incompatible Reagents',
            description: 'Incompatible Reagents field located by label on the create instrument form',
        },
    },

    labelIncompatibleSolvents: {
        selector: 'role=textbox[name="Incompatible Solvents"]',
        metadata: {
            role: 'textbox',
            label: 'Incompatible Solvents',
            description: 'Incompatible Solvents field located by label on the create instrument form',
        },
    },

    labelInstrumentName: {
        selector: 'role=textbox[name="Instrument Name*"]',
        metadata: {
            role: 'textbox',
            label: 'Instrument Name*',
            description: 'Instrument Name field located by label on the create instrument form',
        },
    },

    labelLocation: {
        selector: 'role=textbox[name="Location*"]',
        metadata: {
            role: 'textbox',
            label: 'Location*',
            description: 'Location field located by label on the create instrument form',
        },
    },

    labelModel: {
        selector: 'role=textbox[name="Model*"]',
        metadata: {
            role: 'textbox',
            label: 'Model*',
            description: 'Model field located by label on the create instrument form',
        },
    },

    labelNotes: {
        selector: 'role=textbox[name="Notes"]',
        metadata: {
            role: 'textbox',
            label: 'Notes',
            description: 'Notes field located by label on the create instrument form',
        },
    },

    labelSerialNumber: {
        selector: 'role=textbox[name="Serial Number*"]',
        metadata: {
            role: 'textbox',
            label: 'Serial Number*',
            description: 'Serial Number field located by label on the create instrument form',
        },
    },

    labelStatus: {
        selector: 'role=textbox[name="Status*"]',
        metadata: {
            role: 'textbox',
            label: 'Status*',
            description: 'Status field located by label on the create instrument form',
        },
    },

    labelType: {
        selector: 'role=textbox[name="Type*"]',
        metadata: {
            role: 'textbox',
            label: 'Type*',
            description: 'Type field located by label on the create instrument form',
        },
    },

    locationInput: {
        selector: '[data-testid="location"]',
        metadata: {
            role: 'textbox',
            description: 'Location input field on the edit instrument page',
        },
    },

    loginText: {
        selector: 'text=Login',
        metadata: {
            text: 'Login',
            description: 'Login text element on the login page',
        },
    },

    maxCoolingTemperatureInput: {
        selector: '[data-testid="max-cooling-temperature"]',
        metadata: {
            role: 'textbox',
            description: 'Max cooling temperature input field on the instrument form',
        },
    },

    maxCoolingTemperatureError: {
        selector: '[data-testid="max-cooling-temperature-error"]',
        metadata: {
            description: 'Max cooling temperature validation error on the instrument create form',
        },
    },

    maxSpeedInput: {
        selector: '[data-testid="max-speed"]',
        metadata: {
            role: 'textbox',
            description: 'Max speed input field on the instrument form',
        },
    },

    maxSpeedError: {
        selector: '[data-testid="max-speed-error"]',
        metadata: {
            description: 'Max speed validation error on the instrument create form',
        },
    },

    maxTemperatureInput: {
        selector: '[data-testid="max-temperature"]',
        metadata: {
            role: 'textbox',
            description: 'Max temperature input field on the instrument form',
        },
    },

    maxTemperatureError: {
        selector: '[data-testid="max-temperature-error"]',
        metadata: {
            description: 'Max temperature validation error on the instrument create form',
        },
    },

    maxTimeInput: {
        selector: '[data-testid="max-time"]',
        metadata: {
            role: 'textbox',
            description: 'Max time input field on the instrument form',
        },
    },

    maxTimeError: {
        selector: '[data-testid="max-time-error"]',
        metadata: {
            description: 'Max time validation error on the instrument create form',
        },
    },

    maxVolumeInput: {
        selector: '[data-testid="max-volume"]',
        metadata: {
            role: 'textbox',
            description: 'Max volume input field on the instrument form',
        },
    },

    maxVolumeError: {
        selector: '[data-testid="max-volume-error"]',
        metadata: {
            description: 'Max volume validation error on the instrument create form',
        },
    },

    minCoolingTemperatureInput: {
        selector: '[data-testid="min-cooling-temperature"]',
        metadata: {
            role: 'textbox',
            description: 'Min cooling temperature input field on the instrument form',
        },
    },

    minCoolingTemperatureError: {
        selector: '[data-testid="min-cooling-temperature-error"]',
        metadata: {
            description: 'Min cooling temperature validation error on the instrument create form',
        },
    },

    minSpeedInput: {
        selector: '[data-testid="min-speed"]',
        metadata: {
            role: 'textbox',
            description: 'Min speed input field on the instrument form',
        },
    },

    minSpeedError: {
        selector: '[data-testid="min-speed-error"]',
        metadata: {
            description: 'Min speed validation error on the instrument create form',
        },
    },

    minTemperatureInput: {
        selector: '[data-testid="min-temperature"]',
        metadata: {
            role: 'textbox',
            description: 'Min temperature input field on the instrument form',
        },
    },

    minTemperatureError: {
        selector: '[data-testid="min-temperature-error"]',
        metadata: {
            description: 'Min temperature validation error on the instrument create form',
        },
    },

    minTimeInput: {
        selector: '[data-testid="min-time"]',
        metadata: {
            role: 'textbox',
            description: 'Min time input field on the instrument form',
        },
    },

    minTimeError: {
        selector: '[data-testid="min-time-error"]',
        metadata: {
            description: 'Min time validation error on the instrument create form',
        },
    },

    minVolumeInput: {
        selector: '[data-testid="min-volume"]',
        metadata: {
            role: 'textbox',
            description: 'Min volume input field on the instrument form',
        },
    },

    minVolumeError: {
        selector: '[data-testid="min-volume-error"]',
        metadata: {
            description: 'Min volume validation error on the instrument create form',
        },
    },

    modelInput: {
        selector: '[data-testid="model"]',
        metadata: {
            role: 'textbox',
            description: 'Model input field on the edit instrument page',
        },
    },

    noResultsMessage: {
        selector: '[data-testid="no-results-message"]',
        metadata: {
            role: 'alert',
            text: 'No results found',
            description: 'No results message displayed when search/filter returns no instruments',
        },
    },

    notesInput: {
        selector: '[data-testid="notes"]',
        metadata: {
            role: 'textbox',
            description: 'Notes input field on the edit instrument page',
        },
    },

    pageSubtitle: {
        selector: 'h2',
        metadata: {
            description: 'Secondary page subtitle H2 element',
        },
    },

    pageTitle: {
        selector: 'h1',
        metadata: {
            description: 'Primary page title H1 element',
        },
    },

    pageTitleH3: {
        selector: 'h3',
        metadata: {
            description: 'Section heading H3 element on the instrument form',
        },
    },

    pagingControls: {
        selector: '[data-testid="paging-controls"]',
        metadata: {
            description: 'Pagination controls on the Instruments page',
        },
    },

    protocolStepTypeSelect: {
        selector: '[data-testid="protocol-step-type-select"]',
        metadata: {
            role: 'combobox',
            description: 'Protocol step type select dropdown on the edit instrument form',
        },
    },

    protocolStepTypes: {
        selector: '[data-testid="protocol-step-types"]',
        metadata: {
            description: 'Protocol step types selection area on the instrument form',
        },
    },

    protocolStepTypesCheckboxes: {
        selector: '[data-testid="protocol-step-types"] input[type="checkbox"]',
        metadata: {
            description: 'Protocol step types checkboxes on the instrument form',
        },
    },

    ruleForm: {
        selector: '[data-testid="rule-form"]',
        metadata: {
            description: 'Rule form on the instrument create page',
        },
    },

    ruleStep: {
        selector: '[data-testid="rule-step"]',
        metadata: {
            description: 'Rule step element displayed after adding a rule on the instrument form',
        },
    },

    rulesConstraintsTitle: {
        selector: '[data-testid="rules-constraints-title"]',
        metadata: {
            description: 'Rules & Constraints section title on the edit instrument page',
        },
    },

    rulesEmptyState: {
        selector: '[data-testid="rules-empty-state"]',
        metadata: {
            description: 'Rules empty state text element on the create instrument form',
        },
    },

    saveChangesButton: {
        selector: '[data-testid="save-changes-button"]',
        metadata: {
            role: 'button',
            name: 'Save changes',
            description: 'Save changes button on the Edit instrument form',
        },
    },

    saveChangesButtonByRole: {
        selector: 'role=button[name="Save changes"]',
        metadata: {
            role: 'button',
            name: 'Save changes',
            description: 'Save changes button located by role on the edit instrument form',
        },
    },

    saveInstrumentButton: {
        selector: '[data-testid="save-instrument"]',
        metadata: {
            role: 'button',
            name: 'Save instrument',
            description: 'Save instrument button on the Create instrument form',
        },
    },

    searchButton: {
        selector: '[data-testid="search-button"]',
        metadata: {
            role: 'button',
            name: 'Search',
            description: 'Search button on the Instruments page',
        },
    },

    searchField: {
        selector: '[data-testid="search-field"]',
        metadata: {
            role: 'textbox',
            description: 'Search field variant on the Instruments page',
        },
    },

    searchInput: {
        selector: '[data-testid="search-input"]',
        metadata: {
            role: 'textbox',
            placeholder: 'Search',
            description: 'Search input field on the Instruments page',
        },
    },

    serialNumberInput: {
        selector: '[data-testid="serial-number"]',
        metadata: {
            role: 'textbox',
            description: 'Serial number input field on the edit instrument page',
        },
    },

    sideMenuInstruments: {
        selector: '[data-testid="side-menu-instruments"]',
        metadata: {
            role: 'tab',
            description: 'Instruments tab in the side navigation menu',
        },
    },

    speedError: {
        selector: '[data-testid="speed-error"]',
        metadata: {
            description: 'Speed validation error message on the edit instrument form',
        },
    },

    speedOption: {
        selector: '[data-testid="speed-option"]',
        metadata: {
            description: 'Speed rule option on the instrument create/edit form',
        },
    },

    statusField: {
        selector: '[data-testid="status"]',
        metadata: {
            description: 'Status field on the edit instrument page',
        },
    },

    statusFilter: {
        selector: '[data-testid="status-filter"]',
        metadata: {
            role: 'combobox',
            label: 'Status',
            description: 'Status filter dropdown on the Instruments page',
        },
    },

    statusFilterSelectedOption: {
        selector: '[data-testid="status-filter"] option[selected]',
        metadata: {
            description: 'Currently selected option in the status filter dropdown',
        },
    },

    successToast: {
        selector: '[data-testid="success-toast"]',
        metadata: {
            role: 'alert',
            description: 'Success toast notification after a successful instrument operation',
        },
    },

    temperatureError: {
        selector: '[data-testid="temperature-error"]',
        metadata: {
            description: 'Temperature validation error message on the edit instrument form',
        },
    },

    timeError: {
        selector: '[data-testid="time-error"]',
        metadata: {
            description: 'Time validation error message on the edit instrument form',
        },
    },

    timeOption: {
        selector: '[data-testid="time-option"]',
        metadata: {
            description: 'Time rule option on the instrument create/edit form',
        },
    },

    toastMessage: {
        selector: '[data-testid="toast-message"]',
        metadata: {
            role: 'alert',
            description: 'Toast notification message on the Instruments page',
        },
    },

    typeField: {
        selector: '[data-testid="type"]',
        metadata: {
            description: 'Type field on the edit instrument page',
        },
    },

    volumeError: {
        selector: '[data-testid="volume-error"]',
        metadata: {
            description: 'Volume validation error message on the edit instrument form',
        },
    },

    volumeOption: {
        selector: '[data-testid="volume-option"]',
        metadata: {
            description: 'Volume rule option on the instrument create/edit form',
        },
    },

    workflowIntegrationTitle: {
        selector: '[data-testid="workflow-integration-title"]',
        metadata: {
            description: 'Workflow Integration section title on the edit instrument page',
        },
    },

    workflowStages: {
        selector: '[data-testid="workflow-stages"]',
        metadata: {
            description: 'Workflow stages selection area on the instrument form',
        },
    },

    workflowStagesCheckboxes: {
        selector: '[data-testid="workflow-stages"] input[type="checkbox"]',
        metadata: {
            description: 'Workflow stages checkboxes on the instrument form',
        },
    },


    instrumentNameError: {
        selector: '[data-testid="instrument-name-error"]',
        metadata: {
            role:        'alert',
            name:        'Instrument Name Error',
            description: 'Validation error message displayed below the instrument name input field on the create/edit instrument form',
        },
    },
    modelInputError: {
        selector: '[data-testid="model-input-error"]',
        metadata: {
            role:        'alert',
            name:        'Model Input Error',
            description: 'Validation error message displayed below the model input field on the create instrument form',
        },
    },
    serialNumberInputError: {
        selector: '[data-testid="serial-number-input-error"]',
        metadata: {
            role:        'alert',
            name:        'Serial Number Input Error',
            description: 'Validation error message displayed below the serial number input field on the create instrument form',
        },
    },
    locationInputError: {
        selector: '[data-testid="location-input-error"]',
        metadata: {
            role:        'alert',
            name:        'Location Input Error',
            description: 'Validation error message displayed below the location input field on the create instrument form',
        },
    },
    workflowStagesError: {
        selector: '[data-testid="workflow-stages-error"]',
        metadata: {
            role:        'alert',
            name:        'Workflow Stages Error',
            description: 'Validation error message displayed when no workflow stage is selected on the create instrument form',
        },
    },
    protocolStepTypesError: {
        selector: '[data-testid="protocol-step-types-error"]',
        metadata: {
            role:        'alert',
            name:        'Protocol Step Types Error',
            description: 'Validation error message displayed when no protocol step type is selected on the create instrument form',
        },
    },
    volumeMinMaxError: {
        selector: '[data-testid="volume-min-max-error"]',
        metadata: {
            role:        'alert',
            name:        'Volume Min Max Error',
            description: 'Validation error message shown when min volume value is greater than max volume value on the instrument form',
        },
    },
    temperatureMinMaxError: {
        selector: '[data-testid="temperature-min-max-error"]',
        metadata: {
            role:        'alert',
            name:        'Temperature Min Max Error',
            description: 'Validation error message shown when min heating temperature value is greater than max temperature value on the instrument form',
        },
    },
    speedMinMaxError: {
        selector: '[data-testid="speed-min-max-error"]',
        metadata: {
            role:        'alert',
            name:        'Speed Min Max Error',
            description: 'Validation error message shown when min speed value is greater than max speed value on the instrument form',
        },
    },
    timeMinMaxError: {
        selector: '[data-testid="time-min-max-error"]',
        metadata: {
            role:        'alert',
            name:        'Time Min Max Error',
            description: 'Validation error message shown when min time value is greater than max time value on the instrument form',
        },
    },
    coolingTemperatureMinMaxError: {
        selector: '[data-testid="cooling-temperature-min-max-error"]',
        metadata: {
            role:        'alert',
            name:        'Cooling Temperature Min Max Error',
            description: 'Validation error message shown when min cooling temperature value is greater than max cooling temperature value on the instrument form',
        },
    },


    statusFilterOption: {
        selector: '[data-testid="status-filter-option"]',
        metadata: {
            role:        'option',
            name:        'Status Filter Option',
            description: 'An individual selectable option item within the status filter dropdown on the Instruments page (e.g. Available, In use, Offline, Maintenance, Operational)',
        },
    },


    // ── IC-001 Instrument Metadata Update — new fields ────────────────────────

    instrumentTypeSelect: {
        selector: '[data-testid="instrument-type-select"]',
        metadata: {
            role: 'combobox',
            label: 'Instrument Type',
            description: 'Instrument Type select dropdown on the Create/Edit instrument form (Liquid Handler, Synthesis Workstation, Solid Dispenser)',
        },
    },

    liquidDispensingSupportedSelect: {
        selector: '[data-testid="liquid-dispensing-supported"]',
        metadata: {
            role: 'combobox',
            label: 'Liquid Dispensing Supported',
            description: 'Liquid Dispensing Supported Yes/No field, visible only when Instrument Type = Synthesis Workstation',
        },
    },

    solidDispensingSupportedSelect: {
        selector: '[data-testid="solid-dispensing-supported"]',
        metadata: {
            role: 'combobox',
            label: 'Solid Dispensing Supported',
            description: 'Solid Dispensing Supported Yes/No field, visible only when Instrument Type = Synthesis Workstation',
        },
    },

    liquidDispensingInfoNote: {
        selector: '[data-testid="liquid-dispensing-info-note"]',
        metadata: {
            description: 'Informational note shown when Liquid Dispensing Supported = Yes, describing IC-007 requirement',
        },
    },

    liquidDispensingAmberNote: {
        selector: '[data-testid="liquid-dispensing-amber-note"]',
        metadata: {
            role: 'alert',
            description: 'Amber warning note shown when Liquid Dispensing Supported = No, stating a Liquid Handler must be selected',
        },
    },

    solidDispensingInfoNote: {
        selector: '[data-testid="solid-dispensing-info-note"]',
        metadata: {
            description: 'Informational note shown when Solid Dispensing Supported = Yes, describing IC-009 requirement',
        },
    },

    bothDispensingCapabilityNote: {
        selector: '[data-testid="both-dispensing-capability-note"]',
        metadata: {
            description: 'Combined capability note shown when both Liquid and Solid Dispensing Supported = Yes',
        },
    },

    noDispensingCapabilityAmberBanner: {
        selector: '[data-testid="no-dispensing-capability-banner"]',
        metadata: {
            role: 'alert',
            description: 'Amber banner shown when both Liquid and Solid Dispensing Supported = No on a Synthesis Workstation',
        },
    },

    displayNamePreview: {
        selector: '[data-testid="display-name-preview"]',
        metadata: {
            description: 'Read-only Display Name preview field auto-generated from Name + Lab Identifier on the instrument form',
        },
    },

    nameInput: {
        selector: '[data-testid="name-input"]',
        metadata: {
            role: 'textbox',
            label: 'Name',
            description: 'Instrument model name input field on the Create/Edit instrument form (e.g. "Chemspeed SWING")',
        },
    },

    labIdentifierInput: {
        selector: '[data-testid="lab-identifier-input"]',
        metadata: {
            role: 'textbox',
            label: 'Lab Identifier',
            description: 'Lab Identifier input field on the Create/Edit instrument form (e.g. "Lab 205")',
        },
    },

    manufacturerInput: {
        selector: '[data-testid="manufacturer-input"]',
        metadata: {
            role: 'textbox',
            label: 'Manufacturer',
            description: 'Manufacturer input field on the Create/Edit instrument form',
        },
    },

    automationTypeSelect: {
        selector: '[data-testid="automation-type-select"]',
        metadata: {
            role: 'combobox',
            label: 'Automation Type',
            description: 'Automation Type select dropdown on the Create/Edit instrument form (Automated, Semi-automated, Manual)',
        },
    },

    automationTypeOption: {
        selector: '[data-testid="automation-type-select"] option',
        metadata: {
            description: 'Individual option item within the Automation Type select dropdown',
        },
    },

    activeToggle: {
        selector: '[data-testid="active-toggle"]',
        metadata: {
            role: 'switch',
            label: 'Active',
            description: 'Active/Inactive toggle on the Create/Edit instrument form; defaults to Yes (active)',
        },
    },

    ic002Tab: {
        selector: '[data-testid="ic-002-tab"]',
        metadata: {
            role: 'tab',
            name: 'Vessel Association',
            description: 'IC-002 Vessel Association configuration tab on the instrument record',
        },
    },

    ic007Tab: {
        selector: '[data-testid="ic-007-tab"]',
        metadata: {
            role: 'tab',
            name: 'Liquid Handling Config',
            description: 'IC-007 Liquid Handling Config tab, visible only when Liquid Dispensing Supported = Yes',
        },
    },

    ic008Tab: {
        selector: '[data-testid="ic-008-tab"]',
        metadata: {
            role: 'tab',
            name: 'Sealing Configuration',
            description: 'IC-008 Sealing Configuration tab on the instrument record',
        },
    },

    ic009Tab: {
        selector: '[data-testid="ic-009-tab"]',
        metadata: {
            role: 'tab',
            name: 'Solid Dispensing Config',
            description: 'IC-009 Solid Dispensing Config tab, visible only when Solid Dispensing Supported = Yes or Instrument Type = Solid Dispenser',
        },
    },

    dispensingFlagConfirmModal: {
        selector: '[data-testid="dispensing-flag-confirm-modal"]',
        metadata: {
            role: 'dialog',
            description: 'Confirmation modal shown when changing Liquid or Solid Dispensing Supported from Yes to No on an existing Synthesis Workstation',
        },
    },

    dispensingFlagConfirmButton: {
        selector: '[data-testid="dispensing-flag-confirm-button"]',
        metadata: {
            role: 'button',
            name: 'Confirm',
            description: 'Confirm button in the dispensing flag removal confirmation modal',
        },
    },

    dispensingFlagCancelButton: {
        selector: '[data-testid="dispensing-flag-cancel-button"]',
        metadata: {
            role: 'button',
            name: 'Cancel',
            description: 'Cancel button in the dispensing flag removal confirmation modal',
        },
    },

    labIdentifierDuplicateError: {
        selector: '[data-testid="lab-identifier-duplicate-error"]',
        metadata: {
            role: 'alert',
            description: 'Inline error below Lab Identifier field when display name already exists for another instrument',
        },
    },

    instrumentTypeRequiredError: {
        selector: '[data-testid="instrument-type-required-error"]',
        metadata: {
            role: 'alert',
            description: 'Inline validation error for missing Instrument Type on the Create instrument form',
        },
    },

    labIdentifierRequiredError: {
        selector: '[data-testid="lab-identifier-required-error"]',
        metadata: {
            role: 'alert',
            description: 'Inline validation error for missing Lab Identifier on the Create instrument form',
        },
    },

    manufacturerRequiredError: {
        selector: '[data-testid="manufacturer-required-error"]',
        metadata: {
            role: 'alert',
            description: 'Inline validation error for missing Manufacturer on the Create instrument form',
        },
    },

    automationTypeRequiredError: {
        selector: '[data-testid="automation-type-required-error"]',
        metadata: {
            role: 'alert',
            description: 'Inline validation error for missing Automation Type on the Create instrument form',
        },
    },

    liquidDispensingSupportedRequiredError: {
        selector: '[data-testid="liquid-dispensing-required-error"]',
        metadata: {
            role: 'alert',
            description: 'Inline validation error for missing Liquid Dispensing Supported on a Synthesis Workstation form',
        },
    },

    solidDispensingSupportedRequiredError: {
        selector: '[data-testid="solid-dispensing-required-error"]',
        metadata: {
            role: 'alert',
            description: 'Inline validation error for missing Solid Dispensing Supported on a Synthesis Workstation form',
        },
    },

    campaignMetadataHeader: {
        selector: '[data-testid="campaign-metadata-header"]',
        metadata: {
            description: 'Campaign metadata header bar showing Automation Type and Instrument display name throughout workflow steps',
        },
    },

    campaignInstrumentPicker: {
        selector: '[data-testid="campaign-instrument-picker"]',
        metadata: {
            description: 'Campaign creation instrument picker container listing all active instruments grouped by type',
        },
    },

    instrumentPickerLiquidHandlersSection: {
        selector: '[data-testid="instrument-picker-liquid-handlers"]',
        metadata: {
            description: 'Liquid Handlers section heading within the campaign instrument picker',
        },
    },

    instrumentPickerSynthesisWorkstationsSection: {
        selector: '[data-testid="instrument-picker-synthesis-workstations"]',
        metadata: {
            description: 'Synthesis Workstations section heading within the campaign instrument picker',
        },
    },

    instrumentPickerSolidDispensersSection: {
        selector: '[data-testid="instrument-picker-solid-dispensers"]',
        metadata: {
            description: 'Solid Dispensers section heading within the campaign instrument picker',
        },
    },

    readinessBadgeReady: {
        selector: '[data-testid="readiness-badge-ready"]',
        metadata: {
            description: 'Green Parallel Synthesis Ready or Liquid Handler Ready readiness badge on an instrument picker entry',
        },
    },

    readinessBadgeIncomplete: {
        selector: '[data-testid="readiness-badge-incomplete"]',
        metadata: {
            role: 'alert',
            description: 'Amber Configuration incomplete badge on an instrument picker entry when required config sections are missing',
        },
    },

    accessDeniedMessage: {
        selector: '[data-testid="access-denied"]',
        metadata: {
            description: 'Access denied / 403 Forbidden message shown to non-admin users attempting to access Admin > Instruments',
        },
    },

} satisfies Record<string, LocatorDefinition>;
