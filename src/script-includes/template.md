---
title: "Template"
id: "template"
---

API Name: global.Template

```js
gs.include("PrototypeServer");

var Template = Class.create();

Template.prototype = {
	initialize: function(sysID, currentTableName) {
		this.sys_id = sysID;
		this.currentTableName = currentTableName;
	},
	getValues: function(tableName, elementName) {
		var t = GlideTemplate.get(this.sys_id);
		if (t == null)
			return t;
		var xml = new GlideXMLDocument("template_values");
		t.setApplyChildren(false);
		var target = t.apply();
		var list = t.getTemplateElements();
		for (var i = 0; i < list.size(); i++) {
			var name = String(list.get(i));
			var ge = target.getElement(name);
			if (ge.getED().isVirtual())
				continue;

			var value = this.getValue(ge);
			var label = this.getLabel(ge);
			var listRef = this.getRef(ge);
			var displayVal = listRef ? '' : ge.getDisplayValue();
			// Format display value for List fields containing references.
			var valArray = value.split(',');
			if (listRef) {
				for (var n=0; n<valArray.length; n++) {
					if (valArray[n].indexOf("@") > -1) {
						displayVal = !displayVal ? valArray[n] : displayVal + ", " + valArray[n];
						continue;
					}
					var gr = new GlideRecord(listRef);
					gr.addQuery('sys_id', valArray[n]);
					gr.query();
					if (gr.next()) {
						if (!displayVal)
							displayVal = gr.getDisplayValue();
						else
							displayVal += ", " + gr.getDisplayValue();
					}
				}
			}
			else if (valArray.length > 0) {
				var tempDisplayVal = '';
				var gRecord = new GlideRecord("sys_choice");
				var allTables = GlideDBObjectManager.get().getTables(this.currentTableName);
				var index = allTables.indexOf(ge.getED().getTableName());
				var tables = new Array();
				for (var j=0;j<=index;j++)
					tables.push(allTables.get(j));
				gRecord.addQuery("element", name);
				gRecord.addQuery("name", tables);
				gRecord.addQuery("value", valArray);
				gRecord.orderBy("inactive");
				gRecord.orderBy("sequence");
				gRecord.query();
				while (gRecord.next()) {
					if (!tempDisplayVal)
						tempDisplayVal = gRecord.getValue("label");
					else
						tempDisplayVal += ", " + gRecord.getValue("label");
				}
				if (tempDisplayVal)
					displayVal = tempDisplayVal;
			}
			var e = xml.createElement("item", null);
			e.setAttribute("displayVal", displayVal);
			e.setAttribute("name", name);
			e.setAttribute("value", value);
			e.setAttribute('label', label);
			var dep = ge.getDependent();
			if (dep)
				e.setAttribute('dependent', dep);
		}
		var document =  xml.getDocument();
		answer = document;
		return document;
	},
	getValue: function(ge) {
		var ed = ge.getED();

		//PRB1381270: Since Kingston, we allow datatype like String, Date etc to be encrypted,
		//for encrypted field, we give displayValue, so we do this isEncrypted() check first.
		//Otherwise, since the second check isObject() will return false for String, encrypted data will be returned.
		if (ed.isEncrypted())
			return ge.getDisplayValue() || "";

		if (!ge.isObject())
			return ge + '';

		if (ed.isJournal())
			return ge + '';

		if (ed.isChoiceTable())
			return ge.getChoiceValue() == null ? '' : ge + '';

		//Domain types are same as the reference types for this purpose
		if (ed != null && ed.getInternalType() == 'domain_id')
			return ge + '';

		//PRB1311556: some APIs will call Template.getValue
		//and in this case we also want them to get the displayValue
		if (ed.isDateType() || ed.isTime())
			return ge.getDisplayValue() || "";

		if (ed.getInternalType() == 'glide_duration' || ed.getInternalType() == 'timer')
			return ge.getDurationValue() || "";

		return ge.getValue() || "";
	},
	getLabel: function(ge){
		return ge.getLabel();
	},
	getRef: function(ge){
		if (ge) {
			var ed = ge.getED();
			if (ed && ed.isList())
				return ed.getReference();
		}
		return null;
	}
};

```