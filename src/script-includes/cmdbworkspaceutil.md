---
title: "CmdbWorkspaceUtil"
id: "cmdbworkspaceutil"
---

API Name: global.CmdbWorkspaceUtil

```js
var CmdbWorkspaceUtil = Class.create();
CmdbWorkspaceUtil.prototype = {
    initialize: function() {
    },

    type: 'CmdbWorkspaceUtil',
	
	COMPONENT : "component",
	NAME: "name",
	WIDTH : "width",
	ORDER: "order",
	TABLE: "table",
	VIEW: "view",
	ELEMENT: "element",
	POSITION: "position",
	WORKSPACE : "workspace",
	PRIMARY_FIELD : "primary_field",
	SECONDARY_FIELDS : "secondary_fields",
	LIST_ID : "list_id",
	BEGIN_SPLIT : ".begin_split",
	SPLIT : ".split",
	END_SPLIT : ".end_split",
	ACTIVITY_FORMATTER : "activity.xml",
	FORMATTER : "formatter",
	ACTIVITY_FORMATTER_SYS_ID : "444ea5c6bf310100e628555b3f0739d6",
	CAPTION: "caption",
	KEY_ATTRIBUTES : "Key Attributes",
	MORE_ATTRIBUTES : "More Attributes",
	TYPE: "type",
	VALUE: "value",
	DESCRIPTION: "description",

	SYS_AW_FORM_HEADER : "sys_aw_form_header",
	SYS_AW_RIBBON_SETTING : "sys_aw_ribbon_setting",
	SYS_UI_VIEW: "sys_ui_view",
	SYS_UI_FORM: "sys_ui_form",
	SYS_UI_RELATED_LIST: "sys_ui_related_list",
	SYS_UI_SECTION: "sys_ui_section",
	SYS_PROPERTIES: "sys_properties",
	SYS_UI_RELATED_LIST_ENTRY: "sys_ui_related_list_entry",
	SYS_UI_ELEMENT: "sys_ui_element",
	SYS_UI_FORM_SECTION: "sys_ui_form_section",
	SYS_UI_FORMATTER: "sys_ui_formatter",

	HEALTH_RIBBON_SYS_ID : "e46ac35773102300ee4dd3c72bf6a731",
	RELATIONSHIPS_RIBBON_SYS_ID : "d98a075773102300ee4dd3c72bf6a767",
	TIMELINE_RIBBON_SYS_ID : "f62d039773102300ee4dd3c72bf6a741",

	createWorkspaceFormHeaders : function(table, primaryField, secondaryFields){
		if(!this.formHeadersExist(table)) {
			var gr = new GlideRecord(this.SYS_AW_FORM_HEADER);
			gr.initialize();
			gr.setValue(this.TABLE, table);
			gr.setValue(this.PRIMARY_FIELD, primaryField);
			gr.setValue(this.SECONDARY_FIELDS, secondaryFields);
			gr.insert();
		}
	},
	createBasicWorkspaceForm : function(table, keyAttributes, moreAttributes){
		var workspaceView = new GlideRecord(this.SYS_UI_VIEW);
		workspaceView.addQuery(this.NAME, this.WORKSPACE);
		workspaceView.query();

		while(workspaceView.next()) {
			var workspaceViewSysId = workspaceView.getUniqueValue();

			var grForm = new GlideRecord(this.SYS_UI_FORM);
			grForm.initialize();
			grForm.setValue(this.NAME, table);
			grForm.setValue(this.VIEW, workspaceViewSysId);
			var formId = grForm.insert();

			if(!this.keyAttributesSectionExists(table, workspaceViewSysId)) {
				var gr = new GlideRecord(this.SYS_UI_SECTION);
				gr.initialize();
				gr.setValue(this.CAPTION, this.KEY_ATTRIBUTES);
				gr.setValue(this.NAME, table);
				gr.setValue(this.VIEW, workspaceViewSysId);
				var newUiSectionSysId = gr.insert();

				// Add the key attributes section
				this.addKeyAttributesToSection(newUiSectionSysId, keyAttributes, formId);

				// If the more attributes is not an empty string, add the more attributes section
				if(moreAttributes && moreAttributes.length > 0) {
					this.addMoreAttributesToNewSection(table, workspaceViewSysId, moreAttributes, formId);
				}
			}
		}
	},
	createWorkspaceRibbons: function(table, label){

		var gr;

		if(!this.ribbonSettingExists(table, this.HEALTH_RIBBON_SYS_ID)) {
			// Add the health ribbon component
			gr = new GlideRecord(this.SYS_AW_RIBBON_SETTING);
			gr.initialize();
			gr.setValue(this.NAME, label + " - Health");
			gr.setValue(this.COMPONENT, this.HEALTH_RIBBON_SYS_ID);
			gr.setValue(this.TABLE, table);
			gr.setValue(this.WIDTH, "3");
			gr.setValue(this.ORDER, "0");
			gr.insert();
		}

		if(!this.ribbonSettingExists(table, this.RELATIONSHIPS_RIBBON_SYS_ID)) {
			// Add the relationship ribbon component
			gr = new GlideRecord(this.SYS_AW_RIBBON_SETTING);
			gr.initialize();
			gr.setValue(this.NAME, label + " - Relationships");
			gr.setValue(this.COMPONENT, this.RELATIONSHIPS_RIBBON_SYS_ID);
			gr.setValue(this.TABLE, table);
			gr.setValue(this.WIDTH, "3");
			gr.setValue(this.ORDER, "1");
			gr.insert();
		}

		if(!this.ribbonSettingExists(table, this.TIMELINE_RIBBON_SYS_ID)) {
			// Add the timeline ribbon component
			gr = new GlideRecord(this.SYS_AW_RIBBON_SETTING);
			gr.initialize();
			gr.setValue(this.NAME, label + " - Timeline");
			gr.setValue(this.COMPONENT, this.TIMELINE_RIBBON_SYS_ID);
			gr.setValue(this.TABLE, table);
			gr.setValue(this.WIDTH, "6");
			gr.setValue(this.ORDER, "2");
			gr.insert();
		}
	},
	createActivityStreamFilter: function(table, label, fields){
		if(!this.activityStreamFilterExists(table)) {
			var gr = new GlideRecord(this.SYS_PROPERTIES);
			gr.initialize();
			gr.setValue(this.NAME, "glide.ui." + table + "_activity.fields");
			gr.setValue(this.VALUE, fields);
			gr.setValue(this.DESCRIPTION, label + " activity formatter fields");
			gr.insert();
		}
	},
	createRelatedListSections: function(table, relatedLists){
		var workspaceView = new GlideRecord(this.SYS_UI_VIEW);
		workspaceView.addQuery(this.NAME, this.WORKSPACE);
		workspaceView.query();

		while(workspaceView.next()) {
			var workspaceViewSysId = workspaceView.getUniqueValue();

			if(!this.relatedListsSectionExists(table, workspaceViewSysId)) {
				var gr = new GlideRecord(this.SYS_UI_RELATED_LIST);
				gr.initialize();
				gr.setValue(this.NAME, table);
				gr.setValue(this.VIEW, workspaceViewSysId);
				var newUiRelatedListSysId = gr.insert();
				this.addRelatedLists(newUiRelatedListSysId, relatedLists);
			}
		}
	},
	formHeadersExist: function(table) {
		var gr = new GlideRecord(this.SYS_AW_FORM_HEADER);
		gr.addQuery(this.TABLE, table);
		gr.query();
		return gr.hasNext();
	},
	keyAttributesSectionExists: function (table, workspaceViewSysId) {
		var gr = new GlideRecord(this.SYS_UI_SECTION);
		gr.addQuery(this.NAME, table);
		gr.addQuery(this.CAPTION, this.KEY_ATTRIBUTES);
		gr.addQuery(this.VIEW, workspaceViewSysId);
		gr.query();
		return gr.hasNext();
	},
	ribbonSettingExists: function(table, ribbonSetting) {
		var gr = new GlideRecord(this.SYS_AW_RIBBON_SETTING);
		gr.addQuery(this.TABLE, table);
		gr.addQuery(this.COMPONENT, ribbonSetting);
		gr.query();
		return gr.hasNext();
	},
	activityStreamFilterExists: function (table) {
		var gr = new GlideRecord(this.SYS_PROPERTIES);
		gr.addQuery(this.NAME, "glide.ui." + table + "_activity.fields");
		gr.query();
		return gr.hasNext();
	},
	relatedListsSectionExists: function(table, workspaceViewSysId) {
		var gr = new GlideRecord(this.SYS_UI_RELATED_LIST);
		gr.addQuery(this.NAME, table);
		gr.addQuery(this.VIEW, workspaceViewSysId);
		gr.query();
		return gr.hasNext();
	},
	addKeyAttributesToSection: function(sysUiSection, keyAttributes, formSysId) {
		var attributes = keyAttributes.split(",");
		var gr = new GlideRecord(this.SYS_UI_ELEMENT);

		for(var i = 0; i < attributes.length; i++) {
			var attribute = attributes[i];
			gr.initialize();
			gr.setValue(this.SYS_UI_SECTION, sysUiSection);
			gr.setValue(this.ELEMENT, attribute);
			gr.setValue(this.POSITION, i);

			if(attribute == this.BEGIN_SPLIT || attribute == this.SPLIT || attribute == this.END_SPLIT) {
				gr.setValue(this.TYPE, attribute);
			}
			else if(attribute == this.ACTIVITY_FORMATTER) {
				gr.setValue(this.TYPE, this.FORMATTER);
				gr.setValue(this.SYS_UI_FORMATTER, this.ACTIVITY_FORMATTER_SYS_ID);
			}
			gr.insert();
		}

		var grFormSection = new GlideRecord(this.SYS_UI_FORM_SECTION);
		grFormSection.initialize();
		grFormSection.setValue(this.POSITION, 1);
		grFormSection.setValue(this.SYS_UI_FORM, formSysId);
		grFormSection.setValue(this.SYS_UI_SECTION, sysUiSection);
		grFormSection.insert();
	},
	addMoreAttributesToNewSection: function(table, workspaceViewSysId, moreAttributes, formSysId) {
		// First create the new section for more attributes
		var gr = new GlideRecord(this.SYS_UI_SECTION);
		gr.initialize();
		gr.setValue(this.CAPTION, this.MORE_ATTRIBUTES);
		gr.setValue(this.NAME, table);
		gr.setValue(this.VIEW, workspaceViewSysId);
		var newUiSectionSysId = gr.insert();

		// Split the string
		var attributes = moreAttributes.split(",");
		gr = new GlideRecord(this.SYS_UI_ELEMENT);

		for(var i = 0; i < attributes.length; i++) {
			var attribute = attributes[i];
			gr.initialize();
			gr.setValue(this.SYS_UI_SECTION, newUiSectionSysId);
			gr.setValue(this.ELEMENT, attribute);
			gr.setValue(this.POSITION, i);

			if(attribute == this.BEGIN_SPLIT || attribute == this.SPLIT || attribute == this.END_SPLIT) {
				gr.setValue(this.TYPE, attribute);
			}
			else if(attribute == this.ACTIVITY_FORMATTER) {
				gr.setValue(this.TYPE, this.FORMATTER);
				gr.setValue(this.SYS_UI_FORMATTER, this.ACTIVITY_FORMATTER_SYS_ID);
			}
			gr.insert();
		}

		var grFormSection = new GlideRecord(this.SYS_UI_FORM_SECTION);
		grFormSection.initialize();
		grFormSection.setValue(this.POSITION, 2);
		grFormSection.setValue(this.SYS_UI_FORM, formSysId);
		grFormSection.setValue(this.SYS_UI_SECTION, newUiSectionSysId);
		grFormSection.insert();
	},
	addRelatedLists: function(uiRelatedListSysId, relatedListsObject) {
		// Insert each related list which is passed
		for(var i = 0; i < relatedListsObject.length; i++) {
			var singleRelatedListEntry = relatedListsObject[i];

			var gr = new GlideRecord(this.SYS_UI_RELATED_LIST_ENTRY);
			gr.initialize();
			gr.setValue(this.LIST_ID, uiRelatedListSysId);
			gr.setValue(this.POSITION, i);

			// For each key inside of the related list entry, set the value.
			var keySet = Object.keys(singleRelatedListEntry);
			for(var key in keySet) {
				gr.setValue(keySet[key], singleRelatedListEntry[keySet[key]]);
			}

			gr.insert();
		}
	},
		
	getExtensionTables: function(source){
		var result = new GlideDBObjectManager.get().getAllExtensions(source);
		var tables = [];
		for (var i = 0 ; i < result.size(); i++){
			tables.push(result.get(i));
		}
		return tables;
	},
	
	scheduleCreateJob: function(){
		var job = new GlideRecord("sysauto_script");
		job.get("name", "CMDB workspace forms job");
		SncTriggerSynchronizer.executeNow(job);
	}
};
```