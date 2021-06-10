---
title: "AddTestTemplateAjax"
id: "addtesttemplateajax"
---

API Name: global.AddTestTemplateAjax

```js
var AddTestTemplateAjax = Class.create();
AddTestTemplateAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	/**
	 * creates new steps on existing test by order of steps in test template.
	 * Default values for each step's input variables are populated when they match the specified types
	 */
	addTemplate: function() {
		var testId = this.getParameter('sysparm_test_id');
		var templateId = this.getParameter('sysparm_template_id');
		var testName = this.getParameter('sysparm_test_name');

		// default values defined in add test template modal
		var tableId = this.getParameter('sysparm_table_id');
		var itemId = this.getParameter('sysparm_item_id');
		var rpId = this.getParameter('sysparm_rp_id');

		var templateStepIds = this._getTemplateSteps(templateId);

		// tableId may be null if the template does not have any step that requires table
		var testTableName;
		if (tableId) {
			var tableGR = this._getTableRecord(tableId);
			testTableName = tableGR.name;
		}
			
		if (!testId)
			testId = this._createANewTest(testName, templateStepIds);
		else
			this._setTestDescription(testId, templateStepIds);
		
		var nextOrder = this._getNextOrder(testId); // order of steps in template

		// create each step in the template and provide default inputs
		for (var i = 0; i < templateStepIds.length; i++) {
			this._createStep(testId, templateStepIds[i], nextOrder++, testTableName, itemId, rpId);
		}
		return testId;
	},

	/**
	 * Returns true if the template has at least one step config that has a mandatory table input
	 */
	doesTemplateRequireTable: function() {
		return this._doesTemplateRequire({internal_type: 'table_name'});
	},

	/**
	 * Returns true if the template has at least one step config that has a mandatory catalog item input
	 */
	doesTemplateRequireCatalogItem: function() {
		return this._doesTemplateRequire({internal_type: 'reference', reference: 'sc_cat_item'});
	},

	/**
	 * Returns true if the template has at least one step config that has a mandatory record producer input
	 */
	doesTemplateRequireRecordProducer: function() {
		return this._doesTemplateRequire({internal_type: 'reference', reference: 'sc_cat_item_producer'});
	},

	/**
	 * Returns true if the template has at least one step config that has a mandatory input variable of specified type
	 * @param variable: Object {internal_type: *, reference: *}
	 */
	_doesTemplateRequire: function(variable) {
		var templateId = this.getParameter("sysparm_template_id");
		gs.info("AddTestTemplateAjax: doesTemplateRequire variable: called with template_id " + templateId);
		gs.info("AddTestTemplateAjax: doesTemplateRequire variable: having internal_type: " + variable.internal_type + (!gs.nil(variable['reference']) ? ", reference: " + variable.reference : ""));
		if (!templateId)
			return false;

		var templateSteps = this._getTemplateSteps(templateId);
		return this._doesAnyStepHaveInputVariableByType(templateSteps, variable);
	},

	/**
	 * Returns true if input variable type is defined and mandatory on any of the provided step configs
	 */
	_doesAnyStepHaveInputVariableByType: function(stepConfigIds, variable) {
		var gr = new GlideRecord("atf_input_variable");
		gr.addQuery("internal_type", variable.internal_type);
		if (!gs.nil(variable['reference']))
		  gr.addQuery("reference", variable.reference);
		gr.addQuery("mandatory", "true");
		gr.addQuery("model_id", "IN", stepConfigIds);
		gr.query();
		gs.info("AddTestTemplateAjax: doesTemplateRequire variable: " + (gr.getRowCount() > 0));
		return (gr.getRowCount() > 0);
	},

	/**
	 * sets all step's relevant mandatory inputs with indicated value when criteria matches
	 * @param step GlideRecord of current step
	 * @param variable Object {internal_type: *, reference: *, value: *}
	 */
	_setInputVariablesWithDefault: function(step, variable) {
		var gr = new GlideRecord("atf_input_variable");
		if (gs.nil(variable['internal_type']) || gs.nil(variable['value'])) // required
			return null;
		gr.addQuery("internal_type", variable['internal_type']);
		if (!gs.nil(variable['reference']))
			gr.addQuery("reference", variable['reference']);
		gr.addQuery("mandatory", true);
		gr.addQuery("model_id", step.step_config);
		gr.query();
		// populate all relevant input variables on the new step
		while (gr.next()) {
		    var variableName = gr.element;
			if (step.inputs.getVariablesRecord().isValidField(variableName)) {
				step.inputs[variableName] = variable['value'];

				gs.info("AddTestTemplateAjax: Populating variable on step, step config sys_id: " + step.step_config +
				", variable sys_id: " + gr.sys_id + ", variable name: " + gr.element +
				", default value to set: " + variable.value);
			}
		}
	},

	/**
	 * creates a step from template having specified table, item, record producer, and order values.
	 * Sets all input variables where a default of the same type is specified
	 */
	_createStep: function(testId, stepConfigId, order, testTableName, catItemId, rpId) {
		var gr = new GlideRecord('sys_atf_step');
		gr.initialize();
		gr.test = testId;
		gr.order = order;
		gr.step_config = stepConfigId;

		// Set the variable only if the step has a valid table input variable and the testTableName passed is not null
		var tableVariable = {internal_type: 'table_name', value: testTableName};
		this._setInputVariablesWithDefault(gr, tableVariable);

		// set the step's catalog item by sys_id
		var itemVariable = {internal_type: 'reference', reference: 'sc_cat_item', value: catItemId};
		this._setInputVariablesWithDefault(gr, itemVariable);

		// set the step's record producer by sys_id
		var recordProducerVariable = {internal_type: 'reference', reference: 'sc_cat_item_producer', value: rpId};
		this._setInputVariablesWithDefault(gr, recordProducerVariable);

		gr.insert();
		gs.info("AddTestTemplateAjax: added step: " + gr.sys_id + ", test: " + gr.test + ", step config: " + gr.step_config);
	},
	
	_getNextOrder: function(testId) {		
		var ga = new GlideAggregate('sys_atf_step');
		ga.addQuery('test', testId);
		ga.addAggregate('MAX', 'order');
		ga.groupBy('test');
		ga.query();
		var next = 1;
		if (ga.next())
			return parseInt(ga.getAggregate('MAX', 'order'), 10) + next;
		return next;
	},
	
	_createANewTest: function(testName, templateStepIds) {
		var atfTestGR = new GlideRecord('sys_atf_test');
		atfTestGR.initialize();
		atfTestGR.name = testName;
		atfTestGR.description = this._generateReminderMessage(templateStepIds);
		atfTestGR.insert();
		return atfTestGR.getUniqueValue();
	},
	
	_getStepTemplateReminderMap: function() {
		var stepReminderBySysId = {};
		var gr = new GlideRecord('sys_atf_step_config');
		gr.query();
		while (gr.next()) {
			stepReminderBySysId[gr.getUniqueValue()] = gr.getValue('template_reminder');
		}
		return stepReminderBySysId;
	},
	
	_generateReminderMessage: function(stepConfigIds) {
		var stepReminder = this._getStepTemplateReminderMap();
		var i;
		var message = "Test generated from template. To complete this test do the following:\n";
		for (i = 1; i <= stepConfigIds.length; i++) {
			message += i + ". " + stepReminder[stepConfigIds[i-1]] + "\n";
		}
		return message;
	},
	
	_getTableRecord: function(tableId) {
		var gr = new GlideRecord('sys_db_object');
		gr.get(tableId);
		return gr;
	},
	
	_getTemplateSteps: function(templateId) {
		var gr = new GlideRecord('sys_atf_test_template');
		gr.get(templateId);
		var steps = gr.template;
		return steps.split(',');
	},
	
	_getTestRecord: function(testId) {
		var gr = new GlideRecord('sys_atf_test');
		gr.get(testId);
		return gr;
	},
	
	_setTestDescription: function(testId, stepConfigIds) {
		var testGR = this._getTestRecord(testId);
		var desc = testGR.description;
		if (desc != "")
			desc += "\n" + this._generateReminderMessage(stepConfigIds);
		else
			desc = this._generateReminderMessage(stepConfigIds);
		testGR.setValue('description', desc);
		testGR.update();
	},
	
    type: 'AddTestTemplateAjax'
});

```