---
title: "SCATFUtil"
id: "scatfutil"
---

API Name: global.SCATFUtil

```js
var SCATFUtil = Class.create();
SCATFUtil.prototype = {
    initialize: function() {
    },

	/**
	 **	Populates answer object in the context with the choices.
	**/
	getVariables : function(current) {
		var cat_item_id = current.inputs.catalog_item;
		var varset_id = current.inputs.variable_set;
		//	If Multi-row variable is selected, then, populate its variables only.
		if (varset_id && varset_id != 'undefined') {
			var variablesGr = new GlideRecord('item_option_new');
			variablesGr.addQuery('variable_set', varset_id);
			variablesGr.addActiveQuery();
			variablesGr.query();
			while (variablesGr.next())
				if (this._canValidateVariable(variablesGr.type))
					answer.add(variablesGr.sys_id, variablesGr.question_text || "");
			return;
		}
		if (!cat_item_id)
			return;
		var cat_item = new sn_sc.CatItem(cat_item_id);
		var variablesList = this._getFlatVariables(cat_item.getVariables());

		for (var i = 0; i < variablesList.length; i++) {
			var variable = variablesList[i];
			answer.add(variable.id, variable.label);
		}
	},
	getQuestion : function(qId) {
		return GlideappQuestion.getQuestion(qId);
	},
	getVariableDisplayName : function (qId) {
		var question = GlideappQuestion.getQuestion(qId);
		if (question) {
			if (question.type == 32)
				return question.getName();
			else
				return question.getLabel();
		}	
		else
			return "";
	},
	getVariableType : function (qId) {
		var question = GlideappQuestion.getQuestion(qId);
		if (question)
			return question.getType();
		else
			return "";	
	},
	getValueValidationDescription : function (catalog_conditions) {
		//build query in dispaly format
		var queryString = new GlideQueryString("sc_cart_item", catalog_conditions);
		queryString.deserialize();
		var qObj = queryString.getTerms();
		var LINE_BREAK = "\n";
		var OR = gs.getMessage("or");
		var AND = gs.getMessage("and");
		var description = "";
		var NEW_QUERY_PREFIX = LINE_BREAK + "-- " + OR + " --" + LINE_BREAK;
		var OR_PREFIX = LINE_BREAK + "  " + OR + " ";
		var AND_PREFIX = LINE_BREAK + AND + " ";
		var newQuery = true;
		for (var i = 0; i < qObj.size(); i++) {
			if (qObj.get(i).isEndQuery())
				break;
			var qTerm = qObj.get(i);
			if (qTerm.isNewQuery()) {
				description += NEW_QUERY_PREFIX;
				newQuery = true;
			}
			if (!newQuery) {
				if (qTerm.isOR())
					description += OR_PREFIX;
				else
					description += AND_PREFIX;
			}
			var question = this.getQuestion(qTerm.getField().substring(3));
			if (question != null) {
				var value = qTerm.getValue();
				//	For Duration variable, we need to evaluate 'javascript:' value
				if (value.startsWith("javascript:") && question.getType() == 29) {
					var sBoxEvalObj = new GlideScriptEvaluator();
					sBoxEvalObj.setEnforceSecurity(true);
					value = sBoxEvalObj.evaluateString(value, true);
				}
				question.setValue(value);
				description += question.getLabel() + " " + qTerm.getOperator() + " " + question.getDisplayValue();
			}
			newQuery = false;
		}
		return description;
	},
	_getFlatVariables : function (nestedVariableList) {
		var variableList = [];
		for (var i=0; i<nestedVariableList.length; i++) {
			
			var variable = nestedVariableList[i];
			// showing only name for rich text label variable
			if (variable.type == 32){
				variableList.push({
					label : variable.name,
					id : variable.id
				});
			}
			else if (variable.type && this._canValidateVariable(variable.type))
				variableList.push({
					label : variable.label || variable.name,
					id : variable.id
				});
			if (variable.children) {
				var childList = this._getFlatVariables(variable.children);
				for (var j=0; j<childList.length; j++) {
					variableList.push({
						label: childList[j].label || childList[j].name,
						id : childList[j].id
					});
				}
			}
		}
		return variableList;
	},
	_canValidateVariable : function (type) {
		return (type != "sc_multi_row" && type != 0 && type != 12 && type != 20 && type != 24);
	},
	getValidCategoryQuery : function (current) {
		var query = "active=true";
		if (current.inputs.catalog != "")
			query += "^sc_catalogIN" + current.inputs.catalog;
		return query;
	},
	getValidCatalogItemsQuery : function(current) {
		var query = "active=true";
		if (current.inputs.category != "") {
			var catalogIdStr = "";
			var catItemCatalog = new GlideRecord("sc_cat_item_category");
			catItemCatalog.addQuery("sc_category", current.inputs.category);
			catItemCatalog.query();
			while (catItemCatalog.next())
				catalogIdStr += catItemCatalog.getValue("sc_cat_item") + ",";
			if (catalogIdStr)
				query += "^sys_idIN" + catalogIdStr;
		} else if (current.inputs.catalog != "")
			query += "^sc_catalogsCONTAINS" + current.inputs.catalog;
		return query;
	},
	getMultiRowVarsetItem : function(itemID) {
		var query = "sys_idIN";
		var gr = new GlideRecord('io_set_item');
		gr.addQuery('sc_cat_item', itemID);
		gr.addQuery('variable_set.type', 'one_to_many');
		gr.query();
		var varsetIds = '';
		while (gr.next())
			varsetIds += gr.variable_set + ",";
		if (varsetIds)
			query += varsetIds;
		return query;
	},
    type: 'SCATFUtil'
};

SCATFUtil.getLastUsedCatalogItemInTestBasedOnStep = function (stepGR) {
	if (!stepGR || !stepGR.isValid() || !stepGR.getValue("test"))
		return "";

	var previousStepGr = new GlideRecord("sys_atf_step");
	previousStepGr.addActiveQuery();
	previousStepGr.addQuery("test", stepGR.getValue("test"));
	previousStepGr.orderByDesc("order");
	if (stepGR.getValue("order"))
		previousStepGr.addQuery("order", "<", stepGR.getValue("order"));
	previousStepGr.query();
	while (previousStepGr.next() && previousStepGr.step_config.batch_order_constraint.getValue() != 'stop') {
		if (previousStepGr.inputs.catalog_item)
			return previousStepGr.inputs.catalog_item;
	}
	return "";
};

SCATFUtil.getCurrentOpenOrderGuide = function(stepGR) {
	var OPEN_ORDER_GUIDE_ATF_STEP_SYS_ID = "aced8452731b13008e6b0d573cf6a783";
	if (!stepGR || !stepGR.isValid() || !stepGR.getValue("test"))
		return "";

	var previousStepGr = new GlideRecord("sys_atf_step");
	previousStepGr.addActiveQuery();
	previousStepGr.addQuery("test", stepGR.getValue("test"));
	previousStepGr.orderByDesc("order");
	if (stepGR.getValue("order"))
		previousStepGr.addQuery("order", "<", stepGR.getValue("order"));
	previousStepGr.addQuery('step_config', OPEN_ORDER_GUIDE_ATF_STEP_SYS_ID);
	previousStepGr.query();
	if (previousStepGr.next() && previousStepGr.inputs.catalog_item)
		return previousStepGr.inputs.catalog_item;
	return "";
};
SCATFUtil.getLastTableVarSetOpened = function(stepGr) {
	var ATF_STEP_CONFIG_ADD_ROW_TABLE_VAR = "c7d557d673002300688e0d573cf6a74f";
	var ATF_STEP_CONFIG_SAVE_ROW_TABLE_VAR = "adf6884273902300688e0d573cf6a72a";
	if (!stepGr || !stepGr.isValid() || !stepGr.getValue("test"))
		return "";
	var preStepGr = new GlideRecord("sys_atf_step");
	preStepGr.addActiveQuery();
	preStepGr.addQuery("test", stepGr.getValue("test"));
	preStepGr.addQuery("step_config", "IN", ATF_STEP_CONFIG_ADD_ROW_TABLE_VAR + "," + ATF_STEP_CONFIG_SAVE_ROW_TABLE_VAR);
	preStepGr.orderByDesc("order");
	if (stepGr.getValue("order"))
		preStepGr.addQuery("order", "<", stepGr.getValue("order"));
	preStepGr.query();
	while (preStepGr.next()) {
		if (preStepGr.step_config == ATF_STEP_CONFIG_SAVE_ROW_TABLE_VAR && preStepGr.inputs.assert_type == 'form_submission_cancelled_in_browser')
			continue;
		else if (preStepGr.step_config == ATF_STEP_CONFIG_ADD_ROW_TABLE_VAR)
			return preStepGr.inputs.variable_set;
		else
			break;
	}
	return "";
};

```