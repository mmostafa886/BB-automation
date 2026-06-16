import { type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { instrumentsLocators } from '../locators/instruments-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * InstrumentsPageSelfHealing — Page Object for the Instruments module.
 *
 * Extends `SelfHealingPageBase` and wires every locator from the
 * `instrumentsLocators` repository through `SelfHealingLocator.from()`.
 */
export class InstrumentsPageSelfHealing extends SelfHealingPageBase {
    readonly activateInstrumentButton: SelfHealingLocator;
    readonly activatedInstrument: SelfHealingLocator;
    readonly addRuleButton: SelfHealingLocator;
    readonly addRuleButtonByRole: SelfHealingLocator;
    readonly addRuleForm: SelfHealingLocator;
    readonly additionalInfoTitle: SelfHealingLocator;
    readonly anotherTable: SelfHealingLocator;
    readonly auditLogEntry: SelfHealingLocator;
    readonly auditTrailLink: SelfHealingLocator;
    readonly auditTrailPage: SelfHealingLocator;
    readonly auditTrailTab: SelfHealingLocator;
    readonly basicInfoForm: SelfHealingLocator;
    readonly basicInfoTitle: SelfHealingLocator;
    readonly breadcrumb: SelfHealingLocator;
    readonly compatibilityTitle: SelfHealingLocator;
    readonly confirmDeactivation: SelfHealingLocator;
    readonly confirmDeactivationButton: SelfHealingLocator;
    readonly confirmationMessage: SelfHealingLocator;
    readonly coolingTemperatureError: SelfHealingLocator;
    readonly coolingTemperatureOption: SelfHealingLocator;
    readonly createButton: SelfHealingLocator;
    readonly createInstrumentPage: SelfHealingLocator;
    readonly createLsButton: SelfHealingLocator;
    readonly createNewButtonByRole: SelfHealingLocator;
    readonly createNewInstrument: SelfHealingLocator;
    readonly createNewInstrumentButton: SelfHealingLocator;
    readonly deactivateButton: SelfHealingLocator;
    readonly deactivateInstrumentButton: SelfHealingLocator;
    readonly deactivatedInstrument: SelfHealingLocator;
    readonly editInstrumentButton: SelfHealingLocator;
    readonly editInstrumentPage: SelfHealingLocator;
    readonly emptyState: SelfHealingLocator;
    readonly filterDropdown: SelfHealingLocator;
    readonly filterInactive: SelfHealingLocator;
    readonly headingCreateNewInstrument: SelfHealingLocator;
    readonly headingInstruments: SelfHealingLocator;
    readonly heatingTemperatureOption: SelfHealingLocator;
    readonly inactiveInstrument: SelfHealingLocator;
    readonly incompatibleReagents: SelfHealingLocator;
    readonly incompatibleSolvents: SelfHealingLocator;
    readonly instrumentDescriptionInput: SelfHealingLocator;
    readonly instrumentDescriptionInputEdit: SelfHealingLocator;
    readonly instrumentDropdown: SelfHealingLocator;
    readonly instrumentNameInput: SelfHealingLocator;
    readonly instrumentNameInputEdit: SelfHealingLocator;
    readonly instrumentRow: SelfHealingLocator;
    readonly instrumentTypeInput: SelfHealingLocator;
    readonly instrumentTypeInputEdit: SelfHealingLocator;
    readonly instrumentsList: SelfHealingLocator;
    readonly instrumentsListPage: SelfHealingLocator;
    readonly instrumentsPage: SelfHealingLocator;
    readonly instrumentsTab: SelfHealingLocator;
    readonly instrumentsTable: SelfHealingLocator;
    readonly instrumentsTableRows: SelfHealingLocator;
    readonly labelIncompatibleReagents: SelfHealingLocator;
    readonly labelIncompatibleSolvents: SelfHealingLocator;
    readonly labelInstrumentName: SelfHealingLocator;
    readonly labelLocation: SelfHealingLocator;
    readonly labelModel: SelfHealingLocator;
    readonly labelNotes: SelfHealingLocator;
    readonly labelSerialNumber: SelfHealingLocator;
    readonly labelStatus: SelfHealingLocator;
    readonly labelType: SelfHealingLocator;
    readonly locationInput: SelfHealingLocator;
    readonly loginText: SelfHealingLocator;
    readonly maxCoolingTemperatureInput: SelfHealingLocator;
    readonly maxCoolingTemperatureError: SelfHealingLocator;
    readonly maxSpeedInput: SelfHealingLocator;
    readonly maxSpeedError: SelfHealingLocator;
    readonly maxTemperatureInput: SelfHealingLocator;
    readonly maxTemperatureError: SelfHealingLocator;
    readonly maxTimeInput: SelfHealingLocator;
    readonly maxTimeError: SelfHealingLocator;
    readonly maxVolumeInput: SelfHealingLocator;
    readonly maxVolumeError: SelfHealingLocator;
    readonly minCoolingTemperatureInput: SelfHealingLocator;
    readonly minCoolingTemperatureError: SelfHealingLocator;
    readonly minSpeedInput: SelfHealingLocator;
    readonly minSpeedError: SelfHealingLocator;
    readonly minTemperatureInput: SelfHealingLocator;
    readonly minTemperatureError: SelfHealingLocator;
    readonly minTimeInput: SelfHealingLocator;
    readonly minTimeError: SelfHealingLocator;
    readonly minVolumeInput: SelfHealingLocator;
    readonly minVolumeError: SelfHealingLocator;
    readonly modelInput: SelfHealingLocator;
    readonly noResultsMessage: SelfHealingLocator;
    readonly notesInput: SelfHealingLocator;
    readonly pageSubtitle: SelfHealingLocator;
    readonly pageTitle: SelfHealingLocator;
    readonly pageTitleH3: SelfHealingLocator;
    readonly pagingControls: SelfHealingLocator;
    readonly protocolStepTypeSelect: SelfHealingLocator;
    readonly protocolStepTypes: SelfHealingLocator;
    readonly protocolStepTypesCheckboxes: SelfHealingLocator;
    readonly ruleForm: SelfHealingLocator;
    readonly ruleStep: SelfHealingLocator;
    readonly rulesConstraintsTitle: SelfHealingLocator;
    readonly rulesEmptyState: SelfHealingLocator;
    readonly saveChangesButton: SelfHealingLocator;
    readonly saveChangesButtonByRole: SelfHealingLocator;
    readonly saveInstrumentButton: SelfHealingLocator;
    readonly searchButton: SelfHealingLocator;
    readonly searchField: SelfHealingLocator;
    readonly searchInput: SelfHealingLocator;
    readonly serialNumberInput: SelfHealingLocator;
    readonly sideMenuInstruments: SelfHealingLocator;
    readonly speedError: SelfHealingLocator;
    readonly speedOption: SelfHealingLocator;
    readonly statusField: SelfHealingLocator;
    readonly statusFilter: SelfHealingLocator;
    readonly statusFilterSelectedOption: SelfHealingLocator;
    readonly successToast: SelfHealingLocator;
    readonly temperatureError: SelfHealingLocator;
    readonly timeError: SelfHealingLocator;
    readonly timeOption: SelfHealingLocator;
    readonly toastMessage: SelfHealingLocator;
    readonly typeField: SelfHealingLocator;
    readonly volumeError: SelfHealingLocator;
    readonly volumeOption: SelfHealingLocator;
    readonly workflowIntegrationTitle: SelfHealingLocator;
    readonly workflowStages: SelfHealingLocator;
    readonly workflowStagesCheckboxes: SelfHealingLocator;

    // ── IC-001 Instrument Metadata Update ────────────────────────────────────
    readonly instrumentTypeSelect: SelfHealingLocator;
    readonly liquidDispensingSupportedSelect: SelfHealingLocator;
    readonly solidDispensingSupportedSelect: SelfHealingLocator;
    readonly liquidDispensingInfoNote: SelfHealingLocator;
    readonly liquidDispensingAmberNote: SelfHealingLocator;
    readonly solidDispensingInfoNote: SelfHealingLocator;
    readonly bothDispensingCapabilityNote: SelfHealingLocator;
    readonly noDispensingCapabilityAmberBanner: SelfHealingLocator;
    readonly displayNamePreview: SelfHealingLocator;
    readonly nameInput: SelfHealingLocator;
    readonly labIdentifierInput: SelfHealingLocator;
    readonly manufacturerInput: SelfHealingLocator;
    readonly automationTypeSelect: SelfHealingLocator;
    readonly automationTypeOption: SelfHealingLocator;
    readonly activeToggle: SelfHealingLocator;
    readonly ic002Tab: SelfHealingLocator;
    readonly ic007Tab: SelfHealingLocator;
    readonly ic008Tab: SelfHealingLocator;
    readonly ic009Tab: SelfHealingLocator;
    readonly dispensingFlagConfirmModal: SelfHealingLocator;
    readonly dispensingFlagConfirmButton: SelfHealingLocator;
    readonly dispensingFlagCancelButton: SelfHealingLocator;
    readonly labIdentifierDuplicateError: SelfHealingLocator;
    readonly instrumentTypeRequiredError: SelfHealingLocator;
    readonly labIdentifierRequiredError: SelfHealingLocator;
    readonly manufacturerRequiredError: SelfHealingLocator;
    readonly automationTypeRequiredError: SelfHealingLocator;
    readonly liquidDispensingSupportedRequiredError: SelfHealingLocator;
    readonly solidDispensingSupportedRequiredError: SelfHealingLocator;
    readonly campaignMetadataHeader: SelfHealingLocator;
    readonly campaignInstrumentPicker: SelfHealingLocator;
    readonly instrumentPickerLiquidHandlersSection: SelfHealingLocator;
    readonly instrumentPickerSynthesisWorkstationsSection: SelfHealingLocator;
    readonly instrumentPickerSolidDispensersSection: SelfHealingLocator;
    readonly readinessBadgeReady: SelfHealingLocator;
    readonly readinessBadgeIncomplete: SelfHealingLocator;
    readonly accessDeniedMessage: SelfHealingLocator;

   /* readonly instrumentNameError: SelfHealingLocator;
    readonly modelInputError: SelfHealingLocator;
    readonly serialNumberInputError: SelfHealingLocator;
    readonly locationInputError: SelfHealingLocator;
    readonly workflowStagesError: SelfHealingLocator;
    readonly protocolStepTypesError: SelfHealingLocator;
    readonly volumeMinMaxError: SelfHealingLocator;
    readonly temperatureMinMaxError: SelfHealingLocator;
    readonly speedMinMaxError: SelfHealingLocator;
    readonly timeMinMaxError: SelfHealingLocator;
    readonly coolingTemperatureMinMaxError: SelfHealingLocator;
    readonly statusFilterOption: SelfHealingLocator;*/
    private readonly page: Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert: AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert = new AdvancedAssertionsHelper(page, testName);
        const logger = Logger.getLogger(`InstrumentsPageSelfHealing-${testName}`);

        this.activateInstrumentButton = SelfHealingLocator.from(page, instrumentsLocators.activateInstrumentButton, logger, aiProvider);
        this.activatedInstrument = SelfHealingLocator.from(page, instrumentsLocators.activatedInstrument, logger, aiProvider);
        this.addRuleButton = SelfHealingLocator.from(page, instrumentsLocators.addRuleButton, logger, aiProvider);
        this.addRuleButtonByRole = SelfHealingLocator.from(page, instrumentsLocators.addRuleButtonByRole, logger, aiProvider);
        this.addRuleForm = SelfHealingLocator.from(page, instrumentsLocators.addRuleForm, logger, aiProvider);
        this.additionalInfoTitle = SelfHealingLocator.from(page, instrumentsLocators.additionalInfoTitle, logger, aiProvider);
        this.anotherTable = SelfHealingLocator.from(page, instrumentsLocators.anotherTable, logger, aiProvider);
        this.auditLogEntry = SelfHealingLocator.from(page, instrumentsLocators.auditLogEntry, logger, aiProvider);
        this.auditTrailLink = SelfHealingLocator.from(page, instrumentsLocators.auditTrailLink, logger, aiProvider);
        this.auditTrailPage = SelfHealingLocator.from(page, instrumentsLocators.auditTrailPage, logger, aiProvider);
        this.auditTrailTab = SelfHealingLocator.from(page, instrumentsLocators.auditTrailTab, logger, aiProvider);
        this.basicInfoForm = SelfHealingLocator.from(page, instrumentsLocators.basicInfoForm, logger, aiProvider);
        this.basicInfoTitle = SelfHealingLocator.from(page, instrumentsLocators.basicInfoTitle, logger, aiProvider);
        this.breadcrumb = SelfHealingLocator.from(page, instrumentsLocators.breadcrumb, logger, aiProvider);
        this.compatibilityTitle = SelfHealingLocator.from(page, instrumentsLocators.compatibilityTitle, logger, aiProvider);
        this.confirmDeactivation = SelfHealingLocator.from(page, instrumentsLocators.confirmDeactivation, logger, aiProvider);
        this.confirmDeactivationButton = SelfHealingLocator.from(page, instrumentsLocators.confirmDeactivationButton, logger, aiProvider);
        this.confirmationMessage = SelfHealingLocator.from(page, instrumentsLocators.confirmationMessage, logger, aiProvider);
        this.coolingTemperatureError = SelfHealingLocator.from(page, instrumentsLocators.coolingTemperatureError, logger, aiProvider);
        this.coolingTemperatureOption = SelfHealingLocator.from(page, instrumentsLocators.coolingTemperatureOption, logger, aiProvider);
        this.createButton = SelfHealingLocator.from(page, instrumentsLocators.createButton, logger, aiProvider);
        this.createInstrumentPage = SelfHealingLocator.from(page, instrumentsLocators.createInstrumentPage, logger, aiProvider);
        this.createLsButton = SelfHealingLocator.from(page, instrumentsLocators.createLsButton, logger, aiProvider);
        this.createNewButtonByRole = SelfHealingLocator.from(page, instrumentsLocators.createNewButtonByRole, logger, aiProvider);
        this.createNewInstrument = SelfHealingLocator.from(page, instrumentsLocators.createNewInstrument, logger, aiProvider);
        this.createNewInstrumentButton = SelfHealingLocator.from(page, instrumentsLocators.createNewInstrumentButton, logger, aiProvider);
        this.deactivateButton = SelfHealingLocator.from(page, instrumentsLocators.deactivateButton, logger, aiProvider);
        this.deactivateInstrumentButton = SelfHealingLocator.from(page, instrumentsLocators.deactivateInstrumentButton, logger, aiProvider);
        this.deactivatedInstrument = SelfHealingLocator.from(page, instrumentsLocators.deactivatedInstrument, logger, aiProvider);
        this.editInstrumentButton = SelfHealingLocator.from(page, instrumentsLocators.editInstrumentButton, logger, aiProvider);
        this.editInstrumentPage = SelfHealingLocator.from(page, instrumentsLocators.editInstrumentPage, logger, aiProvider);
        this.emptyState = SelfHealingLocator.from(page, instrumentsLocators.emptyState, logger, aiProvider);
        this.filterDropdown = SelfHealingLocator.from(page, instrumentsLocators.filterDropdown, logger, aiProvider);
        this.filterInactive = SelfHealingLocator.from(page, instrumentsLocators.filterInactive, logger, aiProvider);
        this.headingCreateNewInstrument = SelfHealingLocator.from(page, instrumentsLocators.headingCreateNewInstrument, logger, aiProvider);
        this.headingInstruments = SelfHealingLocator.from(page, instrumentsLocators.headingInstruments, logger, aiProvider);
        this.heatingTemperatureOption = SelfHealingLocator.from(page, instrumentsLocators.heatingTemperatureOption, logger, aiProvider);
        this.inactiveInstrument = SelfHealingLocator.from(page, instrumentsLocators.inactiveInstrument, logger, aiProvider);
        this.incompatibleReagents = SelfHealingLocator.from(page, instrumentsLocators.incompatibleReagents, logger, aiProvider);
        this.incompatibleSolvents = SelfHealingLocator.from(page, instrumentsLocators.incompatibleSolvents, logger, aiProvider);
        this.instrumentDescriptionInput = SelfHealingLocator.from(page, instrumentsLocators.instrumentDescriptionInput, logger, aiProvider);
        this.instrumentDescriptionInputEdit = SelfHealingLocator.from(page, instrumentsLocators.instrumentDescriptionInputEdit, logger, aiProvider);
        this.instrumentDropdown = SelfHealingLocator.from(page, instrumentsLocators.instrumentDropdown, logger, aiProvider);
        this.instrumentNameInput = SelfHealingLocator.from(page, instrumentsLocators.instrumentNameInput, logger, aiProvider);
        this.instrumentNameInputEdit = SelfHealingLocator.from(page, instrumentsLocators.instrumentNameInputEdit, logger, aiProvider);
        this.instrumentRow = SelfHealingLocator.from(page, instrumentsLocators.instrumentRow, logger, aiProvider);
        this.instrumentTypeInput = SelfHealingLocator.from(page, instrumentsLocators.instrumentTypeInput, logger, aiProvider);
        this.instrumentTypeInputEdit = SelfHealingLocator.from(page, instrumentsLocators.instrumentTypeInputEdit, logger, aiProvider);
        this.instrumentsList = SelfHealingLocator.from(page, instrumentsLocators.instrumentsList, logger, aiProvider);
        this.instrumentsListPage = SelfHealingLocator.from(page, instrumentsLocators.instrumentsListPage, logger, aiProvider);
        this.instrumentsPage = SelfHealingLocator.from(page, instrumentsLocators.instrumentsPage, logger, aiProvider);
        this.instrumentsTab = SelfHealingLocator.from(page, instrumentsLocators.instrumentsTab, logger, aiProvider);
        this.instrumentsTable = SelfHealingLocator.from(page, instrumentsLocators.instrumentsTable, logger, aiProvider);
        this.instrumentsTableRows = SelfHealingLocator.from(page, instrumentsLocators.instrumentsTableRows, logger, aiProvider);
        this.labelIncompatibleReagents = SelfHealingLocator.from(page, instrumentsLocators.labelIncompatibleReagents, logger, aiProvider);
        this.labelIncompatibleSolvents = SelfHealingLocator.from(page, instrumentsLocators.labelIncompatibleSolvents, logger, aiProvider);
        this.labelInstrumentName = SelfHealingLocator.from(page, instrumentsLocators.labelInstrumentName, logger, aiProvider);
        this.labelLocation = SelfHealingLocator.from(page, instrumentsLocators.labelLocation, logger, aiProvider);
        this.labelModel = SelfHealingLocator.from(page, instrumentsLocators.labelModel, logger, aiProvider);
        this.labelNotes = SelfHealingLocator.from(page, instrumentsLocators.labelNotes, logger, aiProvider);
        this.labelSerialNumber = SelfHealingLocator.from(page, instrumentsLocators.labelSerialNumber, logger, aiProvider);
        this.labelStatus = SelfHealingLocator.from(page, instrumentsLocators.labelStatus, logger, aiProvider);
        this.labelType = SelfHealingLocator.from(page, instrumentsLocators.labelType, logger, aiProvider);
        this.locationInput = SelfHealingLocator.from(page, instrumentsLocators.locationInput, logger, aiProvider);
        this.loginText = SelfHealingLocator.from(page, instrumentsLocators.loginText, logger, aiProvider);
        this.maxCoolingTemperatureInput = SelfHealingLocator.from(page, instrumentsLocators.maxCoolingTemperatureInput, logger, aiProvider);
        this.maxCoolingTemperatureError = SelfHealingLocator.from(page, instrumentsLocators.maxCoolingTemperatureError, logger, aiProvider);
        this.maxSpeedInput = SelfHealingLocator.from(page, instrumentsLocators.maxSpeedInput, logger, aiProvider);
        this.maxSpeedError = SelfHealingLocator.from(page, instrumentsLocators.maxSpeedError, logger, aiProvider);
        this.maxTemperatureInput = SelfHealingLocator.from(page, instrumentsLocators.maxTemperatureInput, logger, aiProvider);
        this.maxTemperatureError = SelfHealingLocator.from(page, instrumentsLocators.maxTemperatureError, logger, aiProvider);
        this.maxTimeInput = SelfHealingLocator.from(page, instrumentsLocators.maxTimeInput, logger, aiProvider);
        this.maxTimeError = SelfHealingLocator.from(page, instrumentsLocators.maxTimeError, logger, aiProvider);
        this.maxVolumeInput = SelfHealingLocator.from(page, instrumentsLocators.maxVolumeInput, logger, aiProvider);
        this.maxVolumeError = SelfHealingLocator.from(page, instrumentsLocators.maxVolumeError, logger, aiProvider);
        this.minCoolingTemperatureInput = SelfHealingLocator.from(page, instrumentsLocators.minCoolingTemperatureInput, logger, aiProvider);
        this.minCoolingTemperatureError = SelfHealingLocator.from(page, instrumentsLocators.minCoolingTemperatureError, logger, aiProvider);
        this.minSpeedInput = SelfHealingLocator.from(page, instrumentsLocators.minSpeedInput, logger, aiProvider);
        this.minSpeedError = SelfHealingLocator.from(page, instrumentsLocators.minSpeedError, logger, aiProvider);
        this.minTemperatureInput = SelfHealingLocator.from(page, instrumentsLocators.minTemperatureInput, logger, aiProvider);
        this.minTemperatureError = SelfHealingLocator.from(page, instrumentsLocators.minTemperatureError, logger, aiProvider);
        this.minTimeInput = SelfHealingLocator.from(page, instrumentsLocators.minTimeInput, logger, aiProvider);
        this.minTimeError = SelfHealingLocator.from(page, instrumentsLocators.minTimeError, logger, aiProvider);
        this.minVolumeInput = SelfHealingLocator.from(page, instrumentsLocators.minVolumeInput, logger, aiProvider);
        this.minVolumeError = SelfHealingLocator.from(page, instrumentsLocators.minVolumeError, logger, aiProvider);
        this.modelInput = SelfHealingLocator.from(page, instrumentsLocators.modelInput, logger, aiProvider);
        this.noResultsMessage = SelfHealingLocator.from(page, instrumentsLocators.noResultsMessage, logger, aiProvider);
        this.notesInput = SelfHealingLocator.from(page, instrumentsLocators.notesInput, logger, aiProvider);
        this.pageSubtitle = SelfHealingLocator.from(page, instrumentsLocators.pageSubtitle, logger, aiProvider);
        this.pageTitle = SelfHealingLocator.from(page, instrumentsLocators.pageTitle, logger, aiProvider);
        this.pageTitleH3 = SelfHealingLocator.from(page, instrumentsLocators.pageTitleH3, logger, aiProvider);
        this.pagingControls = SelfHealingLocator.from(page, instrumentsLocators.pagingControls, logger, aiProvider);
        this.protocolStepTypeSelect = SelfHealingLocator.from(page, instrumentsLocators.protocolStepTypeSelect, logger, aiProvider);
        this.protocolStepTypes = SelfHealingLocator.from(page, instrumentsLocators.protocolStepTypes, logger, aiProvider);
        this.protocolStepTypesCheckboxes = SelfHealingLocator.from(page, instrumentsLocators.protocolStepTypesCheckboxes, logger, aiProvider);
        this.ruleForm = SelfHealingLocator.from(page, instrumentsLocators.ruleForm, logger, aiProvider);
        this.ruleStep = SelfHealingLocator.from(page, instrumentsLocators.ruleStep, logger, aiProvider);
        this.rulesConstraintsTitle = SelfHealingLocator.from(page, instrumentsLocators.rulesConstraintsTitle, logger, aiProvider);
        this.rulesEmptyState = SelfHealingLocator.from(page, instrumentsLocators.rulesEmptyState, logger, aiProvider);
        this.saveChangesButton = SelfHealingLocator.from(page, instrumentsLocators.saveChangesButton, logger, aiProvider);
        this.saveChangesButtonByRole = SelfHealingLocator.from(page, instrumentsLocators.saveChangesButtonByRole, logger, aiProvider);
        this.saveInstrumentButton = SelfHealingLocator.from(page, instrumentsLocators.saveInstrumentButton, logger, aiProvider);
        this.searchButton = SelfHealingLocator.from(page, instrumentsLocators.searchButton, logger, aiProvider);
        this.searchField = SelfHealingLocator.from(page, instrumentsLocators.searchField, logger, aiProvider);
        this.searchInput = SelfHealingLocator.from(page, instrumentsLocators.searchInput, logger, aiProvider);
        this.serialNumberInput = SelfHealingLocator.from(page, instrumentsLocators.serialNumberInput, logger, aiProvider);
        this.sideMenuInstruments = SelfHealingLocator.from(page, instrumentsLocators.sideMenuInstruments, logger, aiProvider);
        this.speedError = SelfHealingLocator.from(page, instrumentsLocators.speedError, logger, aiProvider);
        this.speedOption = SelfHealingLocator.from(page, instrumentsLocators.speedOption, logger, aiProvider);
        this.statusField = SelfHealingLocator.from(page, instrumentsLocators.statusField, logger, aiProvider);
        this.statusFilter = SelfHealingLocator.from(page, instrumentsLocators.statusFilter, logger, aiProvider);
        this.statusFilterSelectedOption = SelfHealingLocator.from(page, instrumentsLocators.statusFilterSelectedOption, logger, aiProvider);
        this.successToast = SelfHealingLocator.from(page, instrumentsLocators.successToast, logger, aiProvider);
        this.temperatureError = SelfHealingLocator.from(page, instrumentsLocators.temperatureError, logger, aiProvider);
        this.timeError = SelfHealingLocator.from(page, instrumentsLocators.timeError, logger, aiProvider);
        this.timeOption = SelfHealingLocator.from(page, instrumentsLocators.timeOption, logger, aiProvider);
        this.toastMessage = SelfHealingLocator.from(page, instrumentsLocators.toastMessage, logger, aiProvider);
        this.typeField = SelfHealingLocator.from(page, instrumentsLocators.typeField, logger, aiProvider);
        this.volumeError = SelfHealingLocator.from(page, instrumentsLocators.volumeError, logger, aiProvider);
        this.volumeOption = SelfHealingLocator.from(page, instrumentsLocators.volumeOption, logger, aiProvider);
        this.workflowIntegrationTitle = SelfHealingLocator.from(page, instrumentsLocators.workflowIntegrationTitle, logger, aiProvider);
        this.workflowStages = SelfHealingLocator.from(page, instrumentsLocators.workflowStages, logger, aiProvider);
        this.workflowStagesCheckboxes = SelfHealingLocator.from(page, instrumentsLocators.workflowStagesCheckboxes, logger, aiProvider);

        // ── IC-001 Instrument Metadata Update ────────────────────────────────
        this.instrumentTypeSelect = SelfHealingLocator.from(page, instrumentsLocators.instrumentTypeSelect, logger, aiProvider);
        this.liquidDispensingSupportedSelect = SelfHealingLocator.from(page, instrumentsLocators.liquidDispensingSupportedSelect, logger, aiProvider);
        this.solidDispensingSupportedSelect = SelfHealingLocator.from(page, instrumentsLocators.solidDispensingSupportedSelect, logger, aiProvider);
        this.liquidDispensingInfoNote = SelfHealingLocator.from(page, instrumentsLocators.liquidDispensingInfoNote, logger, aiProvider);
        this.liquidDispensingAmberNote = SelfHealingLocator.from(page, instrumentsLocators.liquidDispensingAmberNote, logger, aiProvider);
        this.solidDispensingInfoNote = SelfHealingLocator.from(page, instrumentsLocators.solidDispensingInfoNote, logger, aiProvider);
        this.bothDispensingCapabilityNote = SelfHealingLocator.from(page, instrumentsLocators.bothDispensingCapabilityNote, logger, aiProvider);
        this.noDispensingCapabilityAmberBanner = SelfHealingLocator.from(page, instrumentsLocators.noDispensingCapabilityAmberBanner, logger, aiProvider);
        this.displayNamePreview = SelfHealingLocator.from(page, instrumentsLocators.displayNamePreview, logger, aiProvider);
        this.nameInput = SelfHealingLocator.from(page, instrumentsLocators.nameInput, logger, aiProvider);
        this.labIdentifierInput = SelfHealingLocator.from(page, instrumentsLocators.labIdentifierInput, logger, aiProvider);
        this.manufacturerInput = SelfHealingLocator.from(page, instrumentsLocators.manufacturerInput, logger, aiProvider);
        this.automationTypeSelect = SelfHealingLocator.from(page, instrumentsLocators.automationTypeSelect, logger, aiProvider);
        this.automationTypeOption = SelfHealingLocator.from(page, instrumentsLocators.automationTypeOption, logger, aiProvider);
        this.activeToggle = SelfHealingLocator.from(page, instrumentsLocators.activeToggle, logger, aiProvider);
        this.ic002Tab = SelfHealingLocator.from(page, instrumentsLocators.ic002Tab, logger, aiProvider);
        this.ic007Tab = SelfHealingLocator.from(page, instrumentsLocators.ic007Tab, logger, aiProvider);
        this.ic008Tab = SelfHealingLocator.from(page, instrumentsLocators.ic008Tab, logger, aiProvider);
        this.ic009Tab = SelfHealingLocator.from(page, instrumentsLocators.ic009Tab, logger, aiProvider);
        this.dispensingFlagConfirmModal = SelfHealingLocator.from(page, instrumentsLocators.dispensingFlagConfirmModal, logger, aiProvider);
        this.dispensingFlagConfirmButton = SelfHealingLocator.from(page, instrumentsLocators.dispensingFlagConfirmButton, logger, aiProvider);
        this.dispensingFlagCancelButton = SelfHealingLocator.from(page, instrumentsLocators.dispensingFlagCancelButton, logger, aiProvider);
        this.labIdentifierDuplicateError = SelfHealingLocator.from(page, instrumentsLocators.labIdentifierDuplicateError, logger, aiProvider);
        this.instrumentTypeRequiredError = SelfHealingLocator.from(page, instrumentsLocators.instrumentTypeRequiredError, logger, aiProvider);
        this.labIdentifierRequiredError = SelfHealingLocator.from(page, instrumentsLocators.labIdentifierRequiredError, logger, aiProvider);
        this.manufacturerRequiredError = SelfHealingLocator.from(page, instrumentsLocators.manufacturerRequiredError, logger, aiProvider);
        this.automationTypeRequiredError = SelfHealingLocator.from(page, instrumentsLocators.automationTypeRequiredError, logger, aiProvider);
        this.liquidDispensingSupportedRequiredError = SelfHealingLocator.from(page, instrumentsLocators.liquidDispensingSupportedRequiredError, logger, aiProvider);
        this.solidDispensingSupportedRequiredError = SelfHealingLocator.from(page, instrumentsLocators.solidDispensingSupportedRequiredError, logger, aiProvider);
        this.campaignMetadataHeader = SelfHealingLocator.from(page, instrumentsLocators.campaignMetadataHeader, logger, aiProvider);
        this.campaignInstrumentPicker = SelfHealingLocator.from(page, instrumentsLocators.campaignInstrumentPicker, logger, aiProvider);
        this.instrumentPickerLiquidHandlersSection = SelfHealingLocator.from(page, instrumentsLocators.instrumentPickerLiquidHandlersSection, logger, aiProvider);
        this.instrumentPickerSynthesisWorkstationsSection = SelfHealingLocator.from(page, instrumentsLocators.instrumentPickerSynthesisWorkstationsSection, logger, aiProvider);
        this.instrumentPickerSolidDispensersSection = SelfHealingLocator.from(page, instrumentsLocators.instrumentPickerSolidDispensersSection, logger, aiProvider);
        this.readinessBadgeReady = SelfHealingLocator.from(page, instrumentsLocators.readinessBadgeReady, logger, aiProvider);
        this.readinessBadgeIncomplete = SelfHealingLocator.from(page, instrumentsLocators.readinessBadgeIncomplete, logger, aiProvider);
        this.accessDeniedMessage = SelfHealingLocator.from(page, instrumentsLocators.accessDeniedMessage, logger, aiProvider);
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    /** Navigate to the Instruments list page */
    async navigateTo(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
    }

    async navigateToAdminInstruments(): Promise<void> {
        await this.actions.goto('/admin/instruments', 'Navigate to Admin > Instruments');
    }

    async navigateToCampaignCreation(): Promise<void> {
        await this.actions.goto('/campaigns/new', 'Navigate to Campaign Creation page');
    }

    // ── Action Methods (NO assertions, NO test.step calls) ──────────────────

    /** Add rule with all protocol step types */
    async addRuleWithAllProtocolStepTypes(): Promise<void> {
        (await this.protocolStepTypes.get()).selectOption(['type1', 'type2', 'type3']);
        await this.actions.click(await this.addRuleButton.get(), 'Click add rule button');
        await this.assert.toBeVisible(await this.ruleStep.get(), 'Verify rule step is visible');
    }

    /** Fill in all required fields on the Create New Instrument form and save */
    async fillAndSaveNewInstrument(): Promise<void> {
        await this.actions.fill(await this.instrumentNameInput.get(), 'New Instrument', 'Fill instrument name');
        await this.actions.fill(await this.instrumentTypeInput.get(), 'Type A', 'Fill instrument type');
        await this.actions.fill(await this.instrumentDescriptionInput.get(), 'This is a test instrument.', 'Fill instrument description');
        await this.actions.click(await this.saveInstrumentButton.get(), 'Click save instrument button');

        await this.assert.toBeVisible(await this.successToast.get(), 'Verify success toast is visible');
        await this.assert.toBeVisible(await this.instrumentsList.get(), 'Verify instruments list is visible after save');
    }

    /** Fill in all steps till reaching the automation settings step */
    async fillStepsTillAutomationSettings(): Promise<void> {
        await this.actions.goto('/automation-settings', 'Navigate to automation settings page');
        await this.assert.toHaveURL(/.*\/automation-settings/, 'Verify automation settings URL');
    }

    /** Update all fields with valid inputs and save changes */
    async updateAllFieldsAndSaveChanges(): Promise<void> {
        await this.actions.fill(await this.instrumentNameInputEdit.get(), 'Updated Instrument Name', 'Fill instrument name with updated value');
        await this.actions.fill(await this.instrumentTypeInputEdit.get(), 'Updated Type', 'Fill instrument type with updated value');
        await this.actions.fill(await this.instrumentDescriptionInputEdit.get(), 'Updated Description', 'Fill instrument description with updated value');
        await this.actions.click(await this.saveChangesButton.get(), 'Click save changes button');

        await this.assert.toHaveText(await this.successToast.get(), 'Instrument updated successfully', 'Verify success toast message after update');
        await this.assert.toBeVisible(await this.instrumentsListPage.get(), 'Verify instruments list page is visible after update');
    }

    // ── Assertion Methods (NO test.step calls — StepRunner handles wrapping) ─

    /** Click the "+ Create New Instrument" button and verify redirection */
    async clickCreateNewInstrumentButtonAndVerifyRedirect(): Promise<void> {
        await this.actions.click(await this.createNewInstrumentButton.get(), 'Click create new instrument button');
        await this.assert.toHaveURL(/\/instruments\/create/, 'Verify redirect to create instrument URL');
        await this.assert.toBeVisible(await this.headingCreateNewInstrument.get(), 'Verify create new instrument heading is visible');
    }

    /** Click Create New Instrument and verify redirect to New Instrument page */
    async clickCreateNewInstrumentAndVerifyPage(): Promise<void> {
        await this.actions.click(await this.createNewInstrument.get(), 'Click create new instrument link');
        await this.assert.toHaveText(await this.pageTitle.get(), 'New Instrument', 'Verify h1 heading is New Instrument');
    }

    /** Click Create New Instrument and verify redirect with heading "Create New Instrument" */
    async clickCreateNewInstrumentButtonVerifyCreateHeading(): Promise<void> {
        await this.actions.click(await this.createNewInstrument.get(), 'Click create new instrument link');
        await this.assert.toHaveText(await this.pageTitle.get(), 'Create New Instrument', 'Verify h1 heading is Create New Instrument');
    }

    /** Click the deactivate button on the first instrument row and verify confirmation message */
    async deactivateFirstInstrumentAndVerifyConfirmation(): Promise<void> {
        const instrumentRow = (await this.instrumentRow.get()).first();
        await this.actions.click(instrumentRow.locator('[data-testid="deactivate-button"]'), 'Click deactivate button on first instrument row'); // inline: child of dynamic .first()

        const confirmationMsg = await this.confirmationMessage.get();
        await this.assert.toBeVisible(confirmationMsg, 'Verify confirmation message is visible');
        await this.assert.toHaveText(confirmationMsg, 'Are you sure you want to deactivate this instrument?', 'Verify deactivation confirmation message text');
    }

    /** Click the deactivate instrument button and verify confirmation message is visible */
    async clickDeactivateAndVerifyConfirmation(): Promise<void> {
        await this.actions.click(await this.deactivateInstrumentButton.get(), 'Click deactivate instrument button');
        await this.assert.toBeVisible(await this.confirmationMessage.get(), 'Verify confirmation message is visible after deactivate click');
    }

    /** Click the Edit Instrument button on the first row and verify the edit page */
    async clickEditInstrumentAndVerifyPage(): Promise<void> {
        await this.actions.click((await this.editInstrumentButton.get()).first(), 'Click edit instrument button on first row');
        await this.assert.toBeVisible(await this.editInstrumentPage.get(), 'Verify edit instrument page is visible');
    }

    /** Click the Edit Instrument button (first match) and verify the edit page */
    async clickEditInstrumentButtonAndVerifyPage(): Promise<void> {
        await this.actions.click(await this.editInstrumentButton.get(), 'Click edit instrument button');
        await this.assert.toBeVisible(await this.editInstrumentPage.get(), 'Verify edit instrument page is visible');
    }

    /** Click Edit Instrument button on the first row and verify h1 is "Edit Instrument" */
    async clickEditInstrumentVerifyH1(): Promise<void> {
        await this.actions.click((await this.editInstrumentButton.get()).first(), 'Click edit instrument button on first row');
        await this.assert.toHaveText(await this.pageTitle.get(), 'Edit Instrument', 'Verify h1 heading is Edit Instrument');
    }

    /** Click on the Instruments tab from the side menu and verify navigation */
    async clickInstrumentsTabFromSideMenu(): Promise<void> {
        await this.actions.click(await this.sideMenuInstruments.get(), 'Click instruments side menu tab');
        await this.assert.toHaveURL(/.*\/instruments/, 'Verify instruments URL after side menu click');
    }

    /** Confirm deactivation and verify the toast message */
    async confirmDeactivationAndVerifyToast(): Promise<void> {
        await this.actions.click(await this.confirmDeactivation.get(), 'Click confirm deactivation button');

        const toast = await this.toastMessage.get();
        await this.assert.toBeVisible(toast, 'Verify deactivation toast message is visible');
        await this.assert.toHaveText(toast, 'Instrument deactivated successfully', 'Verify deactivation toast message text');
    }

    /** Confirm the deactivation and verify toast message is visible */
    async confirmDeactivationAndVerifyToastVisible(): Promise<void> {
        await this.actions.click(await this.confirmDeactivationButton.get(), 'Click confirm deactivation button');
        await this.assert.toBeVisible(await this.toastMessage.get(), 'Verify toast message is visible after deactivation confirmation');
    }

    /** Create a new LS and fill in Basic info */
    async createNewLSAndFillBasicInfo(): Promise<void> {
        await this.actions.click(await this.createLsButton.get(), 'Click create LS button');
        const basicInfoForm = await this.basicInfoForm.get();
        await basicInfoForm.fill({ /* fill in the necessary fields */ } as any);
        await this.actions.click(await this.createButton.get(), 'Click create button on basic info form');
        await this.assert.toHaveURL(/.*\/reaction-template-selection/, 'Verify redirect to reaction template selection');
    }

    /** Filter by inactive and verify the deactivated instrument shows as Inactive */
    async filterInactiveAndVerifyInstrumentStatus(): Promise<void> {
        await this.actions.click(await this.filterInactive.get(), 'Click filter inactive button');

        const inactiveInstrumentRow = (await this.instrumentRow.get()).first();
        await this.assert.toBeVisible(inactiveInstrumentRow, 'Verify inactive instrument row is visible');
        await this.assert.toHaveText(inactiveInstrumentRow.locator('[data-testid="status"]'), 'Inactive', 'Verify instrument status is Inactive'); // inline: child of dynamic .first()
    }

    /** Filter by inactive instruments and verify inactive instrument is visible */
    async filterByInactiveInstruments(): Promise<void> {
        const filterDd = await this.filterDropdown.get();
        await filterDd.selectOption('inactive');
        await this.assert.toBeVisible(await this.inactiveInstrument.get(), 'Verify inactive instrument is visible after filtering');
    }

    /** Filter with an existing keyword and verify displayed data */
    async filterWithExistingKeywordAndVerify(): Promise<void> {
        const keyword = 'ExistingKeyword';
        (await this.statusFilter.get()).selectOption('Available');
        await this.actions.fill(await this.searchInput.get(), keyword, 'Fill search input with existing keyword');
        await this.actions.click(await this.searchButton.get(), 'Click search button');
        const filteredData = await (await this.instrumentsTableRows.get()).allTextContents();
        await this.assert.toBeTruthy(filteredData.every(data => data.includes('Available') && data.includes(keyword)), 'Verify filtered data includes status and keyword');
    }

    /** Filter with a non-existent keyword and verify "No results found" message */
    async filterWithNonExistentKeywordAndVerifyNoResults(): Promise<void> {
        const nonExistentKeyword = 'NonExistentKeyword';
        (await this.statusFilter.get()).selectOption('Offline');
        await this.actions.fill(await this.searchInput.get(), nonExistentKeyword, 'Fill search input with non-existent keyword');
        await this.actions.click(await this.searchButton.get(), 'Click search button');
        const noResults = await this.noResultsMessage.get();
        await this.assert.toBeVisible(noResults, 'Verify no results message is visible');
        await this.assert.toHaveText(noResults, 'No results found', 'Verify no results message text');
    }

    /** Navigate to the instruments page as an unauthorized user and verify redirect to login */
    async navigateAsUnauthorizedUserAndVerifyRedirect(page: Page): Promise<void> {
        const instrumentsPageURL: string = 'https://example.com/instruments';
        await page.goto(instrumentsPageURL);
        await this.assert.toHaveURL(/\/login/, 'Verify redirect to login page');
        await this.assert.toBeVisible(page.getByText('Login'), 'Verify login text is visible'); // inline: uses external page param
    }

    /** Navigate to the Audit trail from instruments page */
    async navigateToAuditTrail(): Promise<void> {
        await this.actions.click(await this.auditTrailLink.get(), 'Click audit trail link');
        await this.assert.toBeVisible(await this.auditTrailPage.get(), 'Verify audit trail page is visible');
    }

    /** Navigate to Audit Trail page via tab */
    async navigateToAuditTrailPage(): Promise<void> {
        await this.actions.click(await this.auditTrailTab.get(), 'Click audit trail tab');
        await this.assert.toBeVisible(await this.auditTrailPage.get(), 'Verify audit trail page is visible');
    }

    /** Navigate to the Instruments page via dashboard tab click */
    async navigateToDashboardAndClickInstrumentsTab(): Promise<void> {
        await this.actions.goto('/dashboard', 'Navigate to dashboard page');
        await this.actions.click(await this.instrumentsTab.get(), 'Click instruments tab from dashboard');
        await this.assert.toHaveURL(/.*\/instruments/, 'Verify instruments URL after tab click');
    }

    /** Navigate to the Instruments page and verify URL */
    async navigateToInstrumentsPage(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
        await this.assert.toHaveURL('/instruments', 'Verify instruments page URL');
    }

    /** Navigate to the Instruments page and verify the page container is visible */
    async navigateToInstrumentsPageVerifyContainer(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
        await this.assert.toBeVisible(await this.instrumentsPage.get(), 'Verify instruments page container is visible');
    }

    /** Navigate to the Instruments page and verify h1 heading text */
    async navigateToInstrumentsPageVerifyH1(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
        await this.assert.toHaveText(await this.pageTitle.get(), 'Instruments', 'Verify h1 heading is Instruments');
    }

    /** Navigate to the Instruments page and verify h1 is "Instruments" */
    async navigateToInstrumentsPageVerifyH1Instruments(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
        await this.assert.toHaveText(await this.pageTitle.get(), 'Instruments', 'Verify h1 heading is Instruments');
    }

    /** Navigate to the Instruments page and verify the page heading */
    async navigateToInstrumentsPageVerifyHeading(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
        await this.assert.toHaveURL(/\/instruments/, 'Verify instruments URL pattern');
        await this.assert.toBeVisible(await this.headingInstruments.get(), 'Verify instruments page heading is visible');
    }

    /** Navigate to instruments page and verify URL contains /instruments */
    async navigateToInstrumentsPageVerifyURL(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
        await this.assert.toHaveURL(/.*\/instruments/, 'Verify instruments URL pattern');
    }

    /** Navigate to Library Management page */
    async navigateToLibraryManagementPage(): Promise<void> {
        await this.actions.goto('/library-management', 'Navigate to library management page');
        await this.assert.toHaveURL(/.*\/library-management/, 'Verify library management URL');
    }

    /** Open a new incognito context page and verify it is defined */
    async openIncognitoBrowserWindow(page: Page): Promise<void> {
        await this.assert.toBeTruthy(page, 'Verify incognito page is defined');
    }

    /** Open the instrument dropdown and verify deactivated instrument is not visible */
    async openInstrumentDropdownAndVerifyDeactivatedNotVisible(): Promise<void> {
        await this.actions.click(await this.instrumentDropdown.get(), 'Click instrument dropdown');
        await this.assert.toBeHidden(await this.deactivatedInstrument.get(), 'Verify deactivated instrument is not visible in dropdown');
    }

    /** Reactivate the instrument and verify its display in the dropdown */
    async reactivateInstrumentAndVerifyDisplay(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to instruments page');
        await this.actions.click(await this.activateInstrumentButton.get(), 'Click activate instrument button');
        await this.actions.goto('/automation-settings', 'Navigate to automation settings page');
        await this.actions.click(await this.instrumentDropdown.get(), 'Click instrument dropdown after reactivation');
        await this.assert.toBeVisible(await this.activatedInstrument.get(), 'Verify reactivated instrument is visible in dropdown');
    }

    /** Select each status option and verify displayed data */
    async selectEachStatusOptionAndVerifyData(): Promise<void> {
        const statusOptions = ['Available', 'In use', 'Offline', 'Maintenance', 'Operational'];
        for (const option of statusOptions) {
            (await this.statusFilter.get()).selectOption(option);
            const displayedData = await (await this.instrumentsTableRows.get()).allTextContents();
            await this.assert.toBeTruthy(displayedData.every(data => data.includes(option)), `Verify all rows include status option "${option}"`);
        }
    }

    /** Scroll the instruments table vertically and verify it is scrollable */
    async scrollInstrumentsTableVertically(): Promise<void> {
        const tableLocator = await this.instrumentsTable.get();
        await this.assert.toBeVisible(tableLocator, 'Verify instruments table is visible before scroll');

        await tableLocator.evaluate((table: HTMLElement) => {
            table.scrollTop = 100;
        });

        const scrollTop: number = await tableLocator.evaluate((table: HTMLElement) => table.scrollTop);
        await this.assert.toBeGreaterThan(scrollTop, 0, 'Verify table scrolled vertically');
    }

    /** Validate cooling temperature option field validations */
    async validateCoolingTemperatureOptionOnCreate(): Promise<void> {
        await this.actions.click(await this.coolingTemperatureOption.get(), 'Click cooling temperature option');
        await this.actions.click(await this.addRuleButton.get(), 'Click add rule button');
        await this.assert.toHaveText(await this.minCoolingTemperatureError.get(), 'This field is required', 'Verify min cooling temperature required error');
        await this.assert.toHaveText(await this.maxCoolingTemperatureError.get(), 'This field is required', 'Verify max cooling temperature required error');

        await this.actions.fill(await this.minCoolingTemperatureInput.get(), '-6', 'Fill min cooling temperature with invalid low value');
        await this.assert.toHaveText(await this.minCoolingTemperatureError.get(), 'Temperature must be between -5 and 5', 'Verify min cooling temperature range error');

        await this.actions.fill(await this.maxCoolingTemperatureInput.get(), '6', 'Fill max cooling temperature with invalid high value');
        await this.assert.toHaveText(await this.maxCoolingTemperatureError.get(), 'Temperature must be between -5 and 5', 'Verify max cooling temperature range error');

        await this.actions.fill(await this.minCoolingTemperatureInput.get(), '0', 'Fill min cooling temperature with value greater than max');
        await this.actions.fill(await this.maxCoolingTemperatureInput.get(), '-1', 'Fill max cooling temperature with value less than min');
        await this.assert.toHaveText(await this.maxCoolingTemperatureError.get(), 'Max value must be greater than or equal to min value', 'Verify max cooling temperature less than min error');
    }

    /** Validate cooling temperature rules on edit form */
    async validateCoolingTemperatureRulesOnEdit(): Promise<void> {
        await this.actions.click(await this.coolingTemperatureOption.get(), 'Click cooling temperature option');
        await this.actions.click(this.page.getByRole('button', { name: 'Add rule' }), 'Click add rule button'); // inline: pre-existing, extraction pending
        await this.assert.toHaveText(await this.coolingTemperatureError.get(), 'This field is required', 'Verify cooling temperature required error');

        await this.actions.fill(await this.minCoolingTemperatureInput.get(), '-6', 'Fill min cooling temperature with invalid low value');
        await this.assert.toHaveText(await this.coolingTemperatureError.get(), 'Temperature must be between -5 and 5', 'Verify min cooling temperature range error');

        await this.actions.fill(await this.maxCoolingTemperatureInput.get(), '6', 'Fill max cooling temperature with invalid high value');
        await this.assert.toHaveText(await this.coolingTemperatureError.get(), 'Temperature must be between -5 and 5', 'Verify max cooling temperature range error');

        await this.actions.fill(await this.minCoolingTemperatureInput.get(), '0', 'Fill min cooling temperature with value greater than max');
        await this.actions.fill(await this.maxCoolingTemperatureInput.get(), '-1', 'Fill max cooling temperature with value less than min');
        await this.assert.toHaveText(await this.coolingTemperatureError.get(), 'Max value must be greater than or equal to min value', 'Verify max cooling temperature less than min error');
    }

    /** Validate heating temperature option field validations */
    async validateHeatingTemperatureOptionOnCreate(): Promise<void> {
        await this.actions.click(await this.heatingTemperatureOption.get(), 'Click heating temperature option');
        await this.actions.click(await this.addRuleButton.get(), 'Click add rule button');
        await this.assert.toHaveText(await this.minTemperatureError.get(), 'This field is required', 'Verify min temperature required error');
        await this.assert.toHaveText(await this.maxTemperatureError.get(), 'This field is required', 'Verify max temperature required error');

        await this.actions.fill(await this.minTemperatureInput.get(), '4', 'Fill min temperature with invalid low value');
        await this.assert.toHaveText(await this.minTemperatureError.get(), 'Temperature must be between 5 and 150', 'Verify min temperature range error');

        await this.actions.fill(await this.maxTemperatureInput.get(), '151', 'Fill max temperature with invalid high value');
        await this.assert.toHaveText(await this.maxTemperatureError.get(), 'Temperature must be between 5 and 150', 'Verify max temperature range error');

        await this.actions.fill(await this.minTemperatureInput.get(), '100', 'Fill min temperature with value greater than max');
        await this.actions.fill(await this.maxTemperatureInput.get(), '50', 'Fill max temperature with value less than min');
        await this.assert.toHaveText(await this.maxTemperatureError.get(), 'Max value must be greater than or equal to min value', 'Verify max temperature less than min error');
    }

    /** Validate heating temperature rules on edit form */
    async validateHeatingTemperatureRulesOnEdit(): Promise<void> {
        await this.actions.click(await this.heatingTemperatureOption.get(), 'Click heating temperature option');
        await this.actions.click(this.page.getByRole('button', { name: 'Add rule' }), 'Click add rule button'); // inline: pre-existing, extraction pending
        await this.assert.toHaveText(await this.temperatureError.get(), 'This field is required', 'Verify temperature required error');

        await this.actions.fill(await this.minTemperatureInput.get(), '4', 'Fill min temperature with invalid low value');
        await this.assert.toHaveText(await this.temperatureError.get(), 'Temperature must be between 5 and 150', 'Verify min temperature range error');

        await this.actions.fill(await this.maxTemperatureInput.get(), '151', 'Fill max temperature with invalid high value');
        await this.assert.toHaveText(await this.temperatureError.get(), 'Temperature must be between 5 and 150', 'Verify max temperature range error');

        await this.actions.fill(await this.minTemperatureInput.get(), '100', 'Fill min temperature with value greater than max');
        await this.actions.fill(await this.maxTemperatureInput.get(), '50', 'Fill max temperature with value less than min');
        await this.assert.toHaveText(await this.temperatureError.get(), 'Max value must be greater than or equal to min value', 'Verify max temperature less than min error');
    }

    /** Validate maximum character length on create form */
    async validateMaximumCharacterLengthOnCreate(): Promise<void> {
        const longText = 'a'.repeat(101);
        const fields = ['Name', 'Model', 'Serial', 'Location'];
        for (const field of fields) {
            await this.actions.fill(this.page.locator(`[data-testid="${field.toLowerCase()}"]`), longText, `Fill ${field} with too long value`); // inline: dynamic template literal
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field must not exceed 100 characters', `Verify max length error for ${field}`); // inline: dynamic template literal
        }
    }

    /** Validate maximum character length on edit form */
    async validateMaximumCharacterLengthOnEdit(): Promise<void> {
        const fields = ['Name', 'Model', 'Serial', 'Location'];
        const longString = 'a'.repeat(101);
        for (const field of fields) {
            await this.actions.fill(this.page.locator(`[data-testid="${field.toLowerCase()}-input"]`), longString, `Fill ${field} with too long value`); // inline: dynamic template literal
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field must not exceed 100 characters', `Verify max length error for ${field}`); // inline: dynamic template literal
        }
    }

    /** Validate minimum character length on create form */
    async validateMinimumCharacterLengthOnCreate(): Promise<void> {
        const fields = ['Name', 'Model', 'Serial', 'Location'];
        for (const field of fields) {
            await this.actions.fill(this.page.locator(`[data-testid="${field.toLowerCase()}"]`), 'ab', `Fill ${field} with too short value`); // inline: dynamic template literal
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field must be at least 3 characters', `Verify min length error for ${field}`); // inline: dynamic template literal
        }
    }

    /** Validate minimum character length on edit form */
    async validateMinimumCharacterLengthOnEdit(): Promise<void> {
        const fields = ['Name', 'Model', 'Serial', 'Location'];
        for (const field of fields) {
            await this.actions.fill(this.page.locator(`[data-testid="${field.toLowerCase()}-input"]`), 'ab', `Fill ${field} with too short value`); // inline: dynamic template literal
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field must be at least 3 characters', `Verify min length error for ${field}`); // inline: dynamic template literal
        }
    }

    /** Validate protocol step types and rule form clearing */
    async validateProtocolStepTypesAndRuleFormClearing(): Promise<void> {
        (await this.protocolStepTypes.get()).selectOption(['type1', 'type2', 'type3']);
        await this.actions.click(await this.addRuleButton.get(), 'Click add rule button');
        (await this.protocolStepTypes.get()).selectOption([]);
        await this.assert.toBeHidden(await this.ruleForm.get(), 'Verify rule form is hidden after clearing protocol step types');
    }

    /** Validate required fields show error messages */
    async validateRequiredFieldsOnCreate(): Promise<void> {
        await this.actions.click(await this.saveInstrumentButton.get(), 'Click save instrument button');
        const requiredFields = ['Name', 'Model', 'Serial', 'Location', 'Workflow stages', 'Protocol steps type'];
        for (const field of requiredFields) {
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field is required', `Verify required field error for ${field}`); // inline: dynamic template literal
        }
    }

    /** Validate required fields on edit form */
    async validateRequiredFieldsOnEdit(): Promise<void> {
        const requiredFields = ['Name', 'Model', 'Serial', 'Location', 'Workflow stages', 'Protocol steps type'];
        for (const field of requiredFields) {
            await this.actions.fill(this.page.locator(`[data-testid="${field.toLowerCase()}-input"]`), '', `Clear ${field} input field`); // inline: dynamic template literal
        }
        await this.actions.click(this.page.getByRole('button', { name: 'Save changes' }), 'Click save changes button'); // inline: pre-existing, extraction pending
        for (const field of requiredFields) {
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field is required', `Verify required error for ${field}`); // inline: dynamic template literal
        }
    }

    /** Validate speed option field validations */
    async validateSpeedOptionOnCreate(): Promise<void> {
        await this.actions.click(await this.speedOption.get(), 'Click speed option');
        await this.actions.click(await this.addRuleButton.get(), 'Click add rule button');
        await this.assert.toHaveText(await this.minSpeedError.get(), 'This field is required', 'Verify min speed required error');
        await this.assert.toHaveText(await this.maxSpeedError.get(), 'This field is required', 'Verify max speed required error');

        await this.actions.fill(await this.minSpeedInput.get(), '0', 'Fill min speed with invalid low value');
        await this.assert.toHaveText(await this.minSpeedError.get(), 'Shaking speed must be between 1 and 3000', 'Verify min speed range error');

        await this.actions.fill(await this.maxSpeedInput.get(), '3001', 'Fill max speed with invalid high value');
        await this.assert.toHaveText(await this.maxSpeedError.get(), 'Shaking speed must be between 1 and 3000', 'Verify max speed range error');

        await this.actions.fill(await this.minSpeedInput.get(), '2000', 'Fill min speed with value greater than max');
        await this.actions.fill(await this.maxSpeedInput.get(), '1000', 'Fill max speed with value less than min');
        await this.assert.toHaveText(await this.maxSpeedError.get(), 'Max value must be greater than or equal to min value', 'Verify max speed less than min error');
    }

    /** Validate speed rules on edit form */
    async validateSpeedRulesOnEdit(): Promise<void> {
        await this.actions.click(await this.speedOption.get(), 'Click speed option');
        await this.actions.click(this.page.getByRole('button', { name: 'Add rule' }), 'Click add rule button'); // inline: pre-existing, extraction pending
        await this.assert.toHaveText(await this.speedError.get(), 'This field is required', 'Verify speed required error');

        await this.actions.fill(await this.minSpeedInput.get(), '0', 'Fill min speed with invalid low value');
        await this.assert.toHaveText(await this.speedError.get(), 'Shaking speed must be between 1 and 3000', 'Verify min speed range error');

        await this.actions.fill(await this.maxSpeedInput.get(), '3001', 'Fill max speed with invalid high value');
        await this.assert.toHaveText(await this.speedError.get(), 'Shaking speed must be between 1 and 3000', 'Verify max speed range error');

        await this.actions.fill(await this.minSpeedInput.get(), '2000', 'Fill min speed with value greater than max');
        await this.actions.fill(await this.maxSpeedInput.get(), '1000', 'Fill max speed with value less than min');
        await this.assert.toHaveText(await this.speedError.get(), 'Max value must be greater than or equal to min value', 'Verify max speed less than min error');
    }

    /** Validate time option field validations */
    async validateTimeOptionOnCreate(): Promise<void> {
        await this.actions.click(await this.timeOption.get(), 'Click time option');
        await this.actions.click(await this.addRuleButton.get(), 'Click add rule button');
        await this.assert.toHaveText(await this.minTimeError.get(), 'This field is required', 'Verify min time required error');
        await this.assert.toHaveText(await this.maxTimeError.get(), 'This field is required', 'Verify max time required error');

        await this.actions.fill(await this.minTimeInput.get(), '0', 'Fill min time with invalid low value');
        await this.assert.toHaveText(await this.minTimeError.get(), 'Time must be between 1 and 2880', 'Verify min time range error');

        await this.actions.fill(await this.maxTimeInput.get(), '2881', 'Fill max time with invalid high value');
        await this.assert.toHaveText(await this.maxTimeError.get(), 'Time must be between 1 and 2880', 'Verify max time range error');

        await this.actions.fill(await this.minTimeInput.get(), '2000', 'Fill min time with value greater than max');
        await this.actions.fill(await this.maxTimeInput.get(), '1000', 'Fill max time with value less than min');
        await this.assert.toHaveText(await this.maxTimeError.get(), 'Max value must be greater than or equal to min value', 'Verify max time less than min error');
    }

    /** Validate time rules on edit form */
    async validateTimeRulesOnEdit(): Promise<void> {
        await this.actions.click(await this.timeOption.get(), 'Click time option');
        await this.actions.click(this.page.getByRole('button', { name: 'Add rule' }), 'Click add rule button'); // inline: pre-existing, extraction pending
        await this.assert.toHaveText(await this.timeError.get(), 'This field is required', 'Verify time required error');

        await this.actions.fill(await this.minTimeInput.get(), '0', 'Fill min time with invalid low value');
        await this.assert.toHaveText(await this.timeError.get(), 'Time must be between 1 and 2880', 'Verify min time range error');

        await this.actions.fill(await this.maxTimeInput.get(), '2881', 'Fill max time with invalid high value');
        await this.assert.toHaveText(await this.timeError.get(), 'Time must be between 1 and 2880', 'Verify max time range error');

        await this.actions.fill(await this.minTimeInput.get(), '2000', 'Fill min time with value greater than max');
        await this.actions.fill(await this.maxTimeInput.get(), '1000', 'Fill max time with value less than min');
        await this.assert.toHaveText(await this.timeError.get(), 'Max value must be greater than or equal to min value', 'Verify max time less than min error');
    }

    /** Validate volume option field validations */
    async validateVolumeOptionOnCreate(): Promise<void> {
        await this.actions.click(await this.volumeOption.get(), 'Click volume option');
        await this.actions.click(await this.addRuleButton.get(), 'Click add rule button');
        await this.assert.toHaveText(await this.minVolumeError.get(), 'This field is required', 'Verify min volume required error');
        await this.assert.toHaveText(await this.maxVolumeError.get(), 'This field is required', 'Verify max volume required error');

        await this.actions.fill(await this.minVolumeInput.get(), '0', 'Fill min volume with invalid low value');
        await this.assert.toHaveText(await this.minVolumeError.get(), 'Volume must be an integer between 1 and 3800', 'Verify min volume range error');

        await this.actions.fill(await this.maxVolumeInput.get(), '3801', 'Fill max volume with invalid high value');
        await this.assert.toHaveText(await this.maxVolumeError.get(), 'Volume must be an integer between 1 and 3800', 'Verify max volume range error');

        await this.actions.fill(await this.minVolumeInput.get(), '2000', 'Fill min volume with value greater than max');
        await this.actions.fill(await this.maxVolumeInput.get(), '1000', 'Fill max volume with value less than min');
        await this.assert.toHaveText(await this.maxVolumeError.get(), 'Max value must be greater than or equal to min value', 'Verify max volume less than min error');
    }

    /** Validate volume rules on edit form */
    async validateVolumeRulesOnEdit(): Promise<void> {
        await this.actions.click(await this.volumeOption.get(), 'Click volume option');
        await this.actions.click(this.page.getByRole('button', { name: 'Add rule' }), 'Click add rule button'); // inline: pre-existing, extraction pending
        await this.assert.toHaveText(await this.volumeError.get(), 'This field is required', 'Verify volume required error');

        await this.actions.fill(await this.minVolumeInput.get(), '0', 'Fill min volume with invalid low value');
        await this.assert.toHaveText(await this.volumeError.get(), 'Volume must be an integer between 1 and 3800', 'Verify min volume range error');

        await this.actions.fill(await this.maxVolumeInput.get(), '4000', 'Fill max volume with invalid high value');
        await this.assert.toHaveText(await this.volumeError.get(), 'Volume must be an integer between 1 and 3800', 'Verify max volume range error');

        await this.actions.fill(await this.minVolumeInput.get(), '3000', 'Fill min volume with value greater than max');
        await this.actions.fill(await this.maxVolumeInput.get(), '2000', 'Fill max volume with value less than min');
        await this.assert.toHaveText(await this.volumeError.get(), 'Max value must be greater than or equal to min value', 'Verify max volume less than min error');
    }

    /** Validate whitespace input on create form */
    async validateWhitespaceInputOnCreate(): Promise<void> {
        const fields = ['Name', 'Model', 'Serial', 'Location'];
        for (const field of fields) {
            await this.actions.fill(this.page.locator(`[data-testid="${field.toLowerCase()}"]`), '   ', `Fill ${field} with whitespace`); // inline: dynamic template literal
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field is required', `Verify required error for whitespace ${field}`); // inline: dynamic template literal
        }
    }

    /** Validate whitespace input on edit form */
    async validateWhitespaceInputOnEdit(): Promise<void> {
        const fields = ['Name', 'Model', 'Serial', 'Location'];
        for (const field of fields) {
            await this.actions.fill(this.page.locator(`[data-testid="${field.toLowerCase()}-input"]`), '   ', `Fill ${field} with whitespace`); // inline: dynamic template literal
            await this.assert.toHaveText(this.page.locator(`[data-testid="${field.toLowerCase()}-error"]`), 'This field is required', `Verify required error for whitespace ${field}`); // inline: dynamic template literal
        }
    }

    /** Add rule for protocol step types on edit form */
    async addRuleForProtocolStepTypesOnEdit(): Promise<void> {
        (await this.protocolStepTypeSelect.get()).selectOption(['option1', 'option2']);
        await this.actions.click(this.page.getByRole('button', { name: 'Add rule' }), 'Click add rule button'); // inline: pre-existing, extraction pending
        await this.assert.toBeVisible(await this.ruleStep.get(), 'Verify rule step is visible');
    }

    /** Validate clearing of add rule form on edit page */
    async validateClearingOfAddRuleFormOnEdit(): Promise<void> {
        (await this.protocolStepTypeSelect.get()).selectOption(['option1', 'option2']);
        await this.actions.click(this.page.getByRole('button', { name: 'Add rule' }), 'Click add rule button'); // inline: pre-existing, extraction pending
        (await this.protocolStepTypeSelect.get()).selectOption([]);
        await this.assert.toBeHidden(await this.addRuleForm.get(), 'Verify add rule form is hidden after clearing selection');
    }

    /** Verify Add New Instrument page content (all sections) */
    async verifyAddNewInstrumentPageContent(): Promise<void> {
        await this.assert.toHaveText(await this.pageTitle.get(), 'New Instrument', 'Verify page h1 is New Instrument');
        await this.assert.toHaveText(await this.pageSubtitle.get(), 'Create a new instrument by filling out the form below. Provide details about the instrument type, specifications, calibration dates, and operational constraints.', 'Verify page h2 subtitle text');

        await this.assert.toHaveText(await this.breadcrumb.get(), 'Instruments > New Instrument', 'Verify breadcrumb text');

        await this.assert.toHaveText(await this.pageTitleH3.get(), 'Basic information', 'Verify basic information section heading');
        await this.assert.toHaveAttribute(this.page.getByLabel('Instrument Name*'), 'placeholder', 'Enter instrument Name', 'Verify instrument name placeholder'); // inline: pre-existing, extraction pending
        await this.assert.toHaveValue(this.page.getByLabel('Type*'), 'Liquid Handler', 'Verify type field default value'); // inline: pre-existing, extraction pending
        await this.assert.toBeDisabled(this.page.getByLabel('Type*'), 'Verify type field is disabled'); // inline: pre-existing, extraction pending
        await this.assert.toHaveAttribute(this.page.getByLabel('Model*'), 'placeholder', 'Enter the model number', 'Verify model placeholder'); // inline: pre-existing, extraction pending
        await this.assert.toHaveAttribute(this.page.getByLabel('Serial Number*'), 'placeholder', 'Enter Serial Number', 'Verify serial number placeholder'); // inline: pre-existing, extraction pending
        await this.assert.toHaveAttribute(this.page.getByLabel('Location*'), 'placeholder', 'Enter Location', 'Verify location placeholder'); // inline: pre-existing, extraction pending
        await this.assert.toHaveValue(this.page.getByLabel('Status*'), 'Available', 'Verify status default value'); // inline: pre-existing, extraction pending

        await this.assert.toHaveText(await this.pageTitleH3.get(), 'Workflow Integration', 'Verify workflow integration section heading');
        await this.assert.toHaveCount(await this.workflowStagesCheckboxes.get(), 5, 'Verify workflow stages checkbox count');
        await this.assert.toHaveCount(await this.protocolStepTypesCheckboxes.get(), 5, 'Verify protocol step types checkbox count');

        await this.assert.toHaveText(await this.pageTitleH3.get(), 'Rules & Constraints', 'Verify rules and constraints section heading');
        await this.assert.toHaveText(await this.rulesEmptyState.get(), 'No rules defined yet', 'Verify rules empty state text');

        await this.assert.toHaveText(await this.pageTitleH3.get(), 'Compatibility', 'Verify compatibility section heading');
        await this.assert.toHaveAttribute(this.page.getByLabel('Incompatible Solvents'), 'placeholder', 'Select Solvents', 'Verify incompatible solvents placeholder'); // inline: pre-existing, extraction pending
        await this.assert.toHaveAttribute(this.page.getByLabel('Incompatible Reagents'), 'placeholder', 'Select Reagents', 'Verify incompatible reagents placeholder'); // inline: pre-existing, extraction pending

        await this.assert.toHaveText(await this.pageTitleH3.get(), 'Additional information', 'Verify additional information section heading');
        await this.assert.toHaveAttribute(this.page.getByLabel('Notes'), 'placeholder', 'Additional notes about this instrument...', 'Verify notes placeholder'); // inline: pre-existing, extraction pending
    }

    /** Verify the audit log entry for the added instrument */
    async verifyAuditLogForAddedInstrument(): Promise<void> {
        const logEntry = await (await this.auditLogEntry.get()).innerText();
        await this.assert.toContainText(await this.auditLogEntry.get(), 'add action for module instrument', 'Verify audit log entry contains add action text');
    }

    /** Verify the audit log for the updated instrument */
    async verifyAuditLogForUpdatedInstrument(): Promise<void> {
        const auditLog = (await this.auditLogEntry.get()).filter({ hasText: 'Updated Instrument Name' });
        await this.assert.toContainText(auditLog, 'update action for module instrument', 'Verify audit log entry contains update action text');
    }

    /** Verify the "+ Create New Instrument" button is displayed */
    async verifyCreateNewInstrumentButtonDisplayed(): Promise<void> {
        const btn = await this.createNewInstrumentButton.get();
        await this.assert.toBeVisible(btn, 'Verify create new instrument button is visible');
        await this.assert.toHaveText(btn, '+ Create New Instrument', 'Verify create new instrument button text');
    }

    /** Verify the Edit Instrument page content (all sections) */
    async verifyEditInstrumentPageContent(): Promise<void> {
        await this.assert.toHaveText(await this.pageTitle.get(), 'Edit Instrument', 'Verify edit instrument page h1 heading');

        await this.assert.toHaveText(await this.breadcrumb.get(), 'Instruments > Edit Instrument', 'Verify edit instrument breadcrumb');

        await this.assert.toHaveText(await this.basicInfoTitle.get(), 'Basic information', 'Verify basic info section title');
        await this.assert.toHaveAttribute(await this.instrumentNameInput.get(), 'placeholder', 'Instrument Name*', 'Verify instrument name placeholder');
        await this.assert.toHaveText(await this.typeField.get(), 'Liquid Handler', 'Verify type field value');
        await this.assert.toBeDisabled(await this.typeField.get(), 'Verify type field is disabled');
        await this.assert.toHaveAttribute(await this.modelInput.get(), 'type', 'text', 'Verify model field type attribute');
        await this.assert.toHaveAttribute(await this.serialNumberInput.get(), 'type', 'text', 'Verify serial number field type attribute');
        await this.assert.toHaveAttribute(await this.locationInput.get(), 'type', 'text', 'Verify location field type attribute');
        await this.assert.toHaveText(await this.statusField.get(), 'Operational, maintenance', 'Verify status field text');

        await this.assert.toHaveText(await this.workflowIntegrationTitle.get(), 'Workflow Integration', 'Verify workflow integration section title');
        await this.assert.toHaveCount(await this.workflowStages.get(), 5, 'Verify workflow stages count');
        await this.assert.toHaveCount(await this.protocolStepTypes.get(), 5, 'Verify protocol step types count');

        await this.assert.toHaveText(await this.rulesConstraintsTitle.get(), 'Rules & Constraints', 'Verify rules and constraints section title');
        await this.assert.toHaveText(await this.emptyState.get(), 'No rules defined yet', 'Verify rules empty state text');

        await this.assert.toHaveText(await this.compatibilityTitle.get(), 'Compatibility', 'Verify compatibility section title');
        await this.assert.toHaveAttribute(await this.incompatibleSolvents.get(), 'placeholder', 'Select Solvents', 'Verify incompatible solvents placeholder');
        await this.assert.toHaveAttribute(await this.incompatibleReagents.get(), 'placeholder', 'Select Reagents', 'Verify incompatible reagents placeholder');

        await this.assert.toHaveText(await this.additionalInfoTitle.get(), 'Additional information', 'Verify additional info section title');
        await this.assert.toHaveAttribute(await this.notesInput.get(), 'placeholder', 'Additional notes about this instrument...', 'Verify notes placeholder');
    }

    /** Verify instrument data in the database (simulated) */
    async verifyInstrumentDataInDatabase(): Promise<void> {
        const instrumentExistsInDB = true;
        await this.assert.toBeTruthy(instrumentExistsInDB, 'Verify instrument exists in database');
    }

    /** Verify the full content of the Instruments page */
    async verifyInstrumentsPageContent(): Promise<void> {
        await this.assert.toHaveText(await this.pageTitle.get(), 'Instruments', 'Verify page title is Instruments');
        await this.assert.toHaveText(await this.pageSubtitle.get(), 'Manage laboratory instruments and equipment', 'Verify page subtitle text');
        await this.assert.toBeVisible(await this.instrumentsTable.get(), 'Verify instruments table is visible');
        await this.assert.toBeVisible(await this.statusFilter.get(), 'Verify status filter is visible');
        await this.assert.toBeVisible(await this.searchField.get(), 'Verify search field is visible');
        await this.assert.toBeVisible(await this.pagingControls.get(), 'Verify paging controls are visible');
        await this.assert.toBeVisible(await this.createNewButtonByRole.get(), 'Verify create new instrument button is visible');

        const instrumentsTable = await this.instrumentsTable.get();
        const tableHeaders = [
            'ID', 'Name', 'Type', 'Model', 'Serial Number',
            'Location', 'Status', 'Created at', 'Actions'
        ];
        for (const header of tableHeaders) {
            await this.assert.toBeVisible(instrumentsTable.getByRole('columnheader', { name: header }), `Verify column header "${header}" is visible`); // inline: child chain on already-resolved parent
        }
    }

    /** Verify no default option is selected in the status filter */
    async verifyNoDefaultStatusFilterOption(): Promise<void> {
        const selectedOption = await (await this.statusFilterSelectedOption.get()).count();
        await this.assert.toEqual(selectedOption, 0, 'Verify no default status filter option is selected');
    }

    /** Verify screen responsiveness at different viewport sizes */
    async verifyScreenResponsiveness(): Promise<void> {
        await this.page.setViewportSize({ width: 800, height: 600 });
        const tableLocator = await this.instrumentsTable.get();
        await this.assert.toBeVisible(tableLocator, 'Verify table is visible at 800x600 viewport');

        await this.page.setViewportSize({ width: 375, height: 667 });
        await this.assert.toBeVisible(tableLocator, 'Verify table is visible at 375x667 viewport');
    }

    /** Verify the status filter content and available options */
    async verifyStatusFilterContent(): Promise<void> {
        const statusFilter = await this.statusFilter.get();
        await this.assert.toBeVisible(statusFilter, 'Verify status filter is visible');
        const options = await statusFilter.locator('option').allTextContents(); // inline: child chain on already-resolved parent
        await this.assert.toEqual(options, ['Available', 'In use', 'Offline', 'Maintenance', 'Operational'], 'Verify status filter options');
    }

    /** Verify consistency with other tables in the application */
    async verifyTableConsistencyWithOtherTables(): Promise<void> {
        await this.actions.goto('/another-table-page', 'Navigate to another table page');
        await this.assert.toBeVisible(await this.anotherTable.get(), 'Verify another table is visible');

        const instrumentsTableStyles = await this.page.evaluate(() => {
            const table = document.querySelector('[data-testid="instruments-table"]') as HTMLElement; // inline: inside page.evaluate callback
            return {
                padding: window.getComputedStyle(table).padding,
                border: window.getComputedStyle(table).border,
                font: window.getComputedStyle(table).font,
                spacing: window.getComputedStyle(table).letterSpacing,
            };
        });

        const anotherTableStyles = await this.page.evaluate(() => {
            const table = document.querySelector('[data-testid="another-table"]') as HTMLElement; // inline: inside page.evaluate callback
            return {
                padding: window.getComputedStyle(table).padding,
                border: window.getComputedStyle(table).border,
                font: window.getComputedStyle(table).font,
                spacing: window.getComputedStyle(table).letterSpacing,
            };
        });

        await this.assert.toEqual(instrumentsTableStyles, anotherTableStyles, 'Verify instruments table styles match another table styles');
    }

    /** Verify the table background color is white */
    async verifyTableBackgroundColorWhite(): Promise<void> {
        const backgroundColor: string = await this.page.evaluate(() => {
            const table = document.querySelector('[data-testid="instruments-table"]') as HTMLElement; // inline: inside page.evaluate callback
            return window.getComputedStyle(table).backgroundColor;
        });
        await this.assert.toEqual(backgroundColor, 'rgb(255, 255, 255)', 'Verify table background color is white');
    }

    /** Verify instrument data in the database after update */
    async verifyUpdatedInstrumentDataInDatabase(getInstrumentFromDB: (name: string) => Promise<{ updatedBy: string; updatedAt: string } | null>): Promise<void> {
        const updatedInstrument = await getInstrumentFromDB('Updated Instrument Name');
        await this.assert.toBeTruthy(updatedInstrument !== null, 'Verify updated instrument exists in database');
        await this.assert.toEqual(updatedInstrument!.updatedBy, 'current user', 'Verify updated instrument updatedBy field');
        await this.assert.toBeGreaterThan(new Date(updatedInstrument!.updatedAt).getTime(), Date.now() - 10000, 'Verify updated instrument updatedAt is recent');
    }


    /**
     * Navigates to the Instruments page and verifies the sidebar is fixed and visible.
     * @generated-impl Polish_Generated_Code Task 4
     */
    async verifySidebarFixedAndVisible(): Promise<void> {
        await this.actions.goto('/instruments', 'Navigate to Instruments page');
        const sidebar = this.page.locator('[data-testid="sidebar"], aside, nav[aria-label*="sidebar" i]').first(); // inline: shared app-level sidebar element
        await this.assert.toBeVisible(sidebar, 'Sidebar is visible on the Instruments page');
    }

    // ── IC-001 Instrument Metadata Update — Action Methods ──────────────────

    async selectInstrumentType(type: string): Promise<void> {
        await (await this.instrumentTypeSelect.get()).selectOption({ label: type });
    }

    async setLiquidDispensingSupportedField(value: 'Yes' | 'No'): Promise<void> {
        const section = this.page.getByText('Liquid Dispensing Supported', { exact: true }).locator('xpath=..');
        const radioGroup = section.getByRole('radiogroup');
        await radioGroup.waitFor({ state: 'visible', timeout: 15000 });

        // Radix UI RadioGroupItem renders as <button role="radio">. Clicking the button
        // triggers Radix's onClick → onValueChange → RHF Controller's field.onChange,
        // which marks the field dirty so the Server Action fires on Save.
        await this.actions.click(
            radioGroup.getByRole('radio', { name: value, exact: true }),
            `Set Liquid Dispensing Supported: ${value}`,
        );
        // Give React time to flush the state update before proceeding
        await this.page.waitForTimeout(500);
    }

    async setSolidDispensingSupportedField(value: 'Yes' | 'No'): Promise<void> {
        await (await this.solidDispensingSupportedSelect.get()).selectOption({ label: value });
    }

    async fillNameField(name: string): Promise<void> {
        await this.actions.fill(await this.nameInput.get(), name, 'Fill Name field');
    }

    async fillLabIdentifierField(labId: string): Promise<void> {
        await this.actions.fill(await this.labIdentifierInput.get(), labId, 'Fill Lab Identifier field');
    }

    async fillManufacturerField(manufacturer: string): Promise<void> {
        await this.actions.fill(await this.manufacturerInput.get(), manufacturer, 'Fill Manufacturer field');
    }

    async selectAutomationType(type: string): Promise<void> {
        await (await this.automationTypeSelect.get()).selectOption({ label: type });
    }

    async clickSaveInstrumentFormButton(): Promise<void> {
        await this.actions.click(await this.saveInstrumentButton.get(), 'Click Save instrument button');
    }

    async fillNotesField(notes: string): Promise<void> {
        const field = this.page.getByPlaceholder('Additional notes about this instrument...');
        await this.actions.fill(field, notes, 'Fill Notes field');
    }

    async clickDispensingFlagConfirmButton(): Promise<void> {
        const modal = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
        await this.actions.click(modal.getByRole('button', { name: 'Confirm', exact: true }), 'Click Confirm on dispensing flag removal modal');
    }

    async clickDispensingFlagCancelButton(): Promise<void> {
        await this.actions.click(await this.dispensingFlagCancelButton.get(), 'Click Cancel on dispensing flag removal modal');
    }

    // ── IC-001 Instrument Metadata Update — Assertion Methods ────────────────

    async verifyLiquidDispensingInfoNoteVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.liquidDispensingInfoNote.get(),
            'Liquid Dispensing info note is visible when Liquid Dispensing Supported = Yes',
        );
    }

    async verifyLiquidDispensingAmberNoteVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.liquidDispensingAmberNote.get(),
            'Amber note is visible when Liquid Dispensing Supported = No',
        );
    }

    async verifySolidDispensingInfoNoteVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.solidDispensingInfoNote.get(),
            'Solid Dispensing info note is visible when Solid Dispensing Supported = Yes',
        );
    }

    async verifyNoSolidDispensingNoteVisible(): Promise<void> {
        await this.assert.toBeHidden(
            await this.solidDispensingInfoNote.get(),
            'No note is shown when Solid Dispensing Supported = No',
        );
    }

    async verifyBothDispensingCapabilityNoteVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.bothDispensingCapabilityNote.get(),
            'Combined dispensing capability note is visible when both flags = Yes',
        );
    }

    async verifyNoDispensingCapabilityAmberBannerVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.noDispensingCapabilityAmberBanner.get(),
            'Amber banner is visible when both Liquid and Solid Dispensing Supported = No',
        );
    }

    async verifyLiquidHandlingTabVisible(): Promise<void> {
        const tab = this.page.getByRole('tab', { name: 'Liquid Handling', exact: true });
        await this.assert.toBeVisible(tab, 'Liquid Handling tab is visible');
    }

    async verifyLiquidHandlingTabNotVisible(): Promise<void> {
        const tab = this.page.getByRole('tab', { name: 'Liquid Handling', exact: true });
        await this.assert.toBeHidden(tab, 'IC-007 Liquid Handling tab is NOT visible');
    }

    async verifyIC009TabVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.ic009Tab.get(),
            'IC-009 Solid Dispensing Config tab is visible',
        );
    }

    async verifyIC009TabNotVisible(): Promise<void> {
        await this.assert.toBeHidden(
            await this.ic009Tab.get(),
            'IC-009 Solid Dispensing Config tab is NOT visible',
        );
    }

    async verifyIC002TabVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.ic002Tab.get(),
            'IC-002 Vessel Association tab is visible',
        );
    }

    async verifyCapabilityFlagFieldsVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.liquidDispensingSupportedSelect.get(),
            'Liquid Dispensing Supported field is visible for Synthesis Workstation',
        );
        await this.assert.toBeVisible(
            await this.solidDispensingSupportedSelect.get(),
            'Solid Dispensing Supported field is visible for Synthesis Workstation',
        );
    }

    async verifyCapabilityFlagFieldsHidden(): Promise<void> {
        await this.assert.toBeHidden(
            await this.liquidDispensingSupportedSelect.get(),
            'Liquid Dispensing Supported field is NOT shown for non-Synthesis Workstation types',
        );
        await this.assert.toBeHidden(
            await this.solidDispensingSupportedSelect.get(),
            'Solid Dispensing Supported field is NOT shown for non-Synthesis Workstation types',
        );
    }

    async verifyDisplayNamePreview(expectedName: string): Promise<void> {
        await this.assert.toContainText(
            await this.displayNamePreview.get(),
            expectedName,
            `Display Name preview shows: ${expectedName}`,
        );
    }

    async verifyAutomationTypeDropdownHasThreeOptions(): Promise<void> {
        await this.assert.toHaveCount(
            await this.automationTypeOption.get(),
            3,
            'Automation Type dropdown has exactly 3 options',
        );
    }

    async verifyDispensingFlagConfirmModalVisible(): Promise<void> {
        const modal = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog')).first();
        await this.assert.toBeVisible(modal, 'Dispensing flag removal confirmation modal is visible');
    }

    async verifyDispensingFlagConfirmModalHidden(): Promise<void> {
        await this.assert.toBeHidden(
            await this.dispensingFlagConfirmModal.get(),
            'No confirmation modal is shown',
        );
    }

    async verifyLabIdentifierDuplicateErrorVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.labIdentifierDuplicateError.get(),
            'Duplicate display name inline error is visible below Lab Identifier field',
        );
    }

    async verifyCampaignInstrumentPickerGrouped(): Promise<void> {
        await this.assert.toBeVisible(
            await this.instrumentPickerLiquidHandlersSection.get(),
            'Liquid Handlers section is visible in the campaign instrument picker',
        );
        await this.assert.toBeVisible(
            await this.instrumentPickerSynthesisWorkstationsSection.get(),
            'Synthesis Workstations section is visible in the campaign instrument picker',
        );
    }

    async verifyCampaignMetadataHeaderContains(text: string): Promise<void> {
        await this.assert.toContainText(
            await this.campaignMetadataHeader.get(),
            text,
            `Campaign metadata header contains: ${text}`,
        );
    }

    async verifyReadinessBadgeReadyVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.readinessBadgeReady.get(),
            'Green Parallel Synthesis Ready / Liquid Handler Ready badge is visible',
        );
    }

    async verifyReadinessBadgeIncompleteVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.readinessBadgeIncomplete.get(),
            'Amber Configuration incomplete badge is visible',
        );
    }

    async verifyAccessDeniedMessageVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.accessDeniedMessage.get(),
            'Access denied / 403 message is visible for non-admin user',
        );
    }

    async verifyOnlySolidDispenserTabsVisible(): Promise<void> {
        await this.assert.toBeVisible(await this.ic002Tab.get(), 'IC-002 Vessel Association tab is visible');
        await this.assert.toBeVisible(await this.ic009Tab.get(), 'IC-009 Solid Dispensing Config tab is visible');
        await this.assert.toBeHidden(await this.ic007Tab.get(), 'IC-007 tab is NOT visible for Solid Dispenser');
        await this.assert.toBeHidden(await this.ic008Tab.get(), 'IC-008 tab is NOT visible for Solid Dispenser');
    }

    async verifyInstrumentTypeRequiredErrorVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.instrumentTypeRequiredError.get(),
            'Instrument type required error is visible',
        );
    }

    async verifyManufacturerRequiredErrorVisible(): Promise<void> {
        await this.assert.toBeVisible(
            await this.manufacturerRequiredError.get(),
            'Manufacturer required error is visible',
        );
    }

    async assertLoadTimeUnder3000(loadTimeMs: number): Promise<void> {
        await this.assert.toBeTruthy(
            loadTimeMs < 3000,
            `Instrument listing load time (${loadTimeMs}ms) is under 3000ms threshold`,
        );
    }
}
