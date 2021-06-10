---
title: "AjaxClientHelper"
id: "ajaxclienthelper"
---

API Name: global.AjaxClientHelper

```js
var AjaxClientHelper = Class.create();

		AjaxClientHelper.prototype = Object.extendsObject(AbstractAjaxProcessor , {
			getValues: function() {
				gs.include('Template');
				var t = new Template(this.getParameter('sysparm_sys_id')+'',this.getParameter('sysparm_current_table_name')+'');
				return t.getValues();
			},

			generateChoice: function() {
				gs.include("InternalTypeChoiceList");
				var t = new InternalTypeChoiceList();
				var selectedValue = this.getParameter('sysparm_selected_value');
				if (selectedValue != null) {
					t.setSelected(selectedValue);
				}
				return t.generate();
			},

			generateChoiceTable: function() {
				gs.include("TableChoiceList");
				var t = new TableChoiceList(this);
				return t.generate();
			},

			generateChoiceUpdateTable: function() {
				gs.include("UpdateTableChoiceList");
				var t = new UpdateTableChoiceList();
				return t.generate();
			},

			getDisplay: function() {
				var dependent = this.getParameter('sysparm_dependent');
				var dependentValue = this.getParameter('sysparm_dependent_value');
				var table = this.getParameter('sysparm_table');
				if (dependent && dependentValue) {
					table = String(table);
					var gr;
					if (dependent.includes("group") && 'sys_user' === table.toLowerCase()) {
						gr = new GlideRecord("sys_user_grmember");
						gr.addQuery('group', dependentValue);
						gr.addQuery('user', this.getParameter('sysparm_value'));
					}
					else {
						gr = new GlideRecord(table);
						gr.addQuery('sys_id', this.getParameter('sysparm_value'));
						gr.addQuery(dependent, dependentValue);
					}
					gr.query();
					if(!gr.next()) {
						return '';
					}
				}
				return getDisplayValueOf(table, this.getValue());
			}


		});
```