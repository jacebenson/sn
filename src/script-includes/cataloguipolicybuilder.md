---
title: "CatalogUIPolicyBuilder"
id: "cataloguipolicybuilder"
---

API Name: global.CatalogUIPolicyBuilder

```js
var CatalogUIPolicyBuilder = Class.create();

CatalogUIPolicyBuilder.prototype = Object.extendsObject(UIPolicyBuilder, {
   
   initialize: function() {
      UIPolicyBuilder.prototype.initialize.call(this);
   },
      
   _processPolicy: function(gr) {
	  this._addPolicy(gr);
   },
  
   _addPolicy: function(gr) {
         var scriptTrue = "";
         var scriptFalse = "";
	  
         var scriptName = this._getScriptName(gr.sys_id, "true");
         if (this.uiPolicy.scripts[scriptName])
            scriptTrue = scriptName;
         
         scriptName = this._getScriptName(gr.sys_id, "false");
         if (this.uiPolicy.scripts[scriptName])
            scriptFalse = scriptName;

   	     var fieldPolicy = {};
         
         fieldPolicy.source_table = gr.getTableName();
	     fieldPolicy.table = "(catalog)";
		 fieldPolicy.sys_id = gr.getUniqueValue();
         fieldPolicy.short_description = gr.short_description.toString();
         fieldPolicy.reverse = (gr.reverse_if_false.toString() == "true");
         fieldPolicy.onload = (gr.on_load.toString() == "true");
         fieldPolicy.script_true = scriptTrue;
         fieldPolicy.script_false = scriptFalse;
         fieldPolicy.debug = this.debug;
         this.uiPolicy.fieldPolicies.push(fieldPolicy);
         
         // Handle the conditions
         var conditions = [];
         fieldPolicy.conditions = conditions;
         
         var eq = new GlideQueryString();
         eq.init(fieldPolicy.table, gr.catalog_conditions);
         eq.deserialize();
         var terms = eq.getTerms();
         fieldPolicy.condition_fields = [];
         for (var i = 0; i != terms.size(); i++) {
            var term = terms.get(i);
            if (term.isEndQuery())
               continue;
            
            // determine field type
            var termField = term.getTermField();
            var fieldType = this._getVariableType(termField);
            if (!fieldType)
               continue;

			var condition = {};
			var fieldName = this._getTermField(termField);
			condition.newquery = term.isNewQuery();
			condition.field = fieldName + '';
			condition.oper = this._convertOper(term.getOperator() + '');
			condition.value = this._getTermValue(term.getValue());
			condition.type = fieldType;
			condition.or = term.isOR();
			conditions.push(condition);

            fieldPolicy.condition_fields.push(fieldName);
         }
         
         // get the policy actions
         var actions = [];
         fieldPolicy.actions = actions;
         
         var actionGR = new GlideRecord('catalog_ui_policy_action');
         actionGR.addQuery('ui_policy', gr.sys_id);
         actionGR.orderBy('order');
         actionGR.query();
         while (actionGR.next()) {
            var action = {};
            action.name = this._getTermField(actionGR.catalog_variable.toString());
            action.mandatory = actionGR.mandatory.toString();
            action.visible = actionGR.visible.toString();
            action.disabled = actionGR.disabled.toString();
			action.cleared = actionGR.cleared.toString();
            actions.push(action);
         }
   },

   /* get the Glide data type for the variable */
   _getVariableType: function(sysid) {
         if (sysid.startsWith("IO:"))
            sysid = sysid.substring(3);
         var question = GlideappQuestion.getQuestion(sysid, null);
         if (!question) {
            gs.log("CatalogUIPolicyBuilder: Cannot get question for '" + sysid + "'.  Skipping term");
            return null;
         }
         var ed = question.getED();
         return ed.getInternalType();
   },

	_getTermValue : function(value) {
		if (!value.startsWith("IO:"))
			return value;
		var sysid = value.substring(0, 35);
		var field = this._getVariable(sysid);
		return (field == sysid) ? value : value.replace(sysid, field);
	},

	_getTermField: function(sysid) {
		return this._getVariable(sysid);
	},

	_getVariable: function(sysid) {
		if (typeof current == "undefined" || !current || (current.getTableName() == 'sys_user' && current.isValidField('wizard_id')))
			return sysid;
		var plainID = sysid;
		if (plainID.startsWith("IO:"))
			plainID = plainID.substring(3);
		// If the current form is not sc_task or sc_req_item, then its record producer generated items form
		if (current.getTableName() != 'sc_task' && current.getTableName() != 'sc_req_item') {
			var itemGR = new GlideRecord('item_option_new');
			if (itemGR.get(plainID)) {
				return "variables." + itemGR.getDisplayValue('name');
			} else {
				itemGR = new GlideRecord('item_option_new_set');
				if (itemGR.get(plainID))
					return "variables." + itemGR.getDisplayValue('internal_name');
				else
					return sysid;
			}
		}

		var gr = new GlideRecord('sc_item_option_mtom');
		if (current.getTableName() == 'sc_task')
			gr.addQuery('request_item', current.request_item);
		else // sc_req_item
			gr.addQuery('request_item', current.sys_id);
		gr.addQuery('sc_item_option.item_option_new', plainID);
		gr.query();
		if (!gr.next()) {
			var vsGR = new GlideRecord('item_option_new_set');
			if (vsGR.get(plainID))
				return "variables." + vsGR.internal_name;
			return sysid;
		}
		return "variables." + gr.sc_item_option.item_option_new.name;
	},

   type: 'CatalogUIPolicyBuilder'
});
```