---
title: "ViewCloneDefaultWorker"
id: "viewclonedefaultworker"
---

API Name: global.ViewCloneDefaultWorker

```js
var ViewCloneDefaultWorker = Class.create();

ViewCloneDefaultWorker.prototype = {

	initialize: function (parameters) {
		parameters = (typeof parameters !== 'undefined') ? String(parameters) : "{}";

		this.currentStep = 0;
		this.paramObj = JSON.parse(parameters);
		this.tracker = SNC.GlideExecutionTracker.getLastRunning();

		this.defaultSections = JSON.parse(this.paramObj.sysparm_sections || "[]");
		this.table = this.paramObj.sysparm_table;
		this.title = this.paramObj.sysparm_title;
		this.view = this.paramObj.sysparm_view;
	},

	process: function() {

		var defaultSectionID;
		var gr;
		var hasMultipleSections;
		var i;
		var msg;
		var numberOfSections;
		var position = 0;
		var sectionNumber;
		var sl;
		var ss;
		var tableName;
		var targetFormID;
		var targetSectionID;
		var targetViewID;

		try {

			// Make sure we have an array of at least one section
			if (!Array.isArray(this.defaultSections) || this.defaultSections.length === 0)
				throw "no sections provided";
			numberOfSections = this.defaultSections.length;
			hasMultipleSections = numberOfSections > 1;

			// Determine total number of steps and percent to increment
			if (hasMultipleSections)
				this.totalSteps = 2 + (numberOfSections * 3);
			else
				this.totalSteps = 1 + (numberOfSections * 2);
			this.percentJump = Math.floor(100 / this.totalSteps);

			// Get SYS_UI_VIEW sys_id or create it
			this._updateTracker("Getting UI View [sys_ui_view] record");
			sl = new GlideScriptViewManager(this.view);
			sl.setTitle(this.title);
			targetViewID = String(sl.getID());
			if (targetViewID === "")
				throw "error getting target view id";

			// If more than one section, create SYS_UI_FORM
			if (hasMultipleSections) {
				this._updateTracker("Creating UI Form [sys_ui_form] record");
				// Create SYS_UI_FORM for target view
				ss = new GlideSysSection(null, this.table);
				tableName = ss.getTableName();
				if (!tableName)
					throw "could not get table name from " + this.table;
				gr = new GlideRecord("sys_ui_form");
				gr.newRecord();
				gr.setValue("name", tableName);
				gr.setValue("view", targetViewID);
				targetFormID = gr.insert();
				if (targetFormID === null)
					throw "error inserting sys_ui_form";
			}

			// For each SYS_UI_SECTION in Default View
			for (i = 0; i < numberOfSections; i++) {
				sectionNumber = String(i + 1);
				defaultSectionID = this.defaultSections[i];
				gr = new GlideRecord("sys_ui_section");
				if (!gr.get(defaultSectionID))
					continue;

				// Modify view to target view and insert
				this._updateTracker("Section {0}: Cloning UI Section [sys_ui_section] record", sectionNumber);
				gr.setValue("view", targetViewID);
				targetSectionID = gr.insert();
				if (targetSectionID === null)
					throw "error inserting sys_ui_section";

				// If more than one section, create SYS_UI_FORM_SECTION
				if (hasMultipleSections) {
					this._updateTracker("Section {0}: Creating Form Section [sys_ui_form_section] record", sectionNumber);
					gr = new GlideRecord("sys_ui_form_section");
					gr.newRecord();
					gr.setValue("sys_ui_form", targetFormID);
					gr.setValue("sys_ui_section", targetSectionID);
					gr.setValue("position", position++);
					if (!gr.insert())
						throw "error inserting sys_ui_form_section";
				}

				// Clone SYS_UI_ELEMENT records from default to target section
				this._updateTracker("Section {0}: Cloning Section Elements [sys_ui_section] records", sectionNumber);
				gr = new GlideRecord("sys_ui_element");
				gr.addQuery("sys_ui_section", defaultSectionID);
				gr.query();
				while (gr.next()) {
					gr.setValue("sys_ui_section", targetSectionID);
					if (!gr.insert())
						throw "error inserting sys_ui_element";
				}
			}
			msg = gs.getMessage("Default view successfully cloned");
			this.tracker.success(msg);
			this.tracker.updateResult(msg);
		} catch (e) {
			msg = gs.getMessage("An error occurred while cloning the Default view");
			this.tracker.fail(msg);
			this.tracker.updateResult(e);
		}
	},

	_updateTracker: function(key, keyArgs) {
		var msg = gs.getMessage(key, keyArgs);
		this.currentStep += 1;
		this.tracker.updatePercentComplete(this.currentStep * this.percentJump);
		this.tracker.updateMessage(msg);
	},

	type: 'ViewCloneDefaultWorker'
};

```