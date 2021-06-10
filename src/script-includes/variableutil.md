---
title: "VariableUtil"
id: "variableutil"
---

API Name: global.VariableUtil

```js
var VariableUtil = Class.create();
VariableUtil.prototype = {
    initialize: function() {

    },
	getDisplayValue : function (questionId, questionValue) {
		var question = GlideappQuestion.getQuestion(questionId);
		if (question) {
			question.setValue(questionValue);
			return question.getDisplayValue();
		}
		return this.getMultiRowSetDisplayValue(questionId, questionValue);
	},
	getMultiRowSetDisplayValue : function (vSetId, questionValue) {
		var vSetGr = new GlideRecord("item_option_new_set");
		var resultArr = [];
		if (vSetGr.get(vSetId)) {
			var multiRowSetQuestions = [];
			var multiRowSetMetaGr = new GlideRecord("item_option_new");
			multiRowSetMetaGr.addQuery("variable_set", vSetId);
			multiRowSetMetaGr.query();
			while (multiRowSetMetaGr.next()) {
				var q = GlideappQuestion.getQuestion(multiRowSetMetaGr.getUniqueValue(), multiRowSetMetaGr);
				multiRowSetQuestions.push(q);
			}
			var valArr = JSON.parse(questionValue);
			for (var i=0 ; i < valArr.length; i++) {
				var row = valArr[i];
				var rowVal = {};
				for (var j=0; j < multiRowSetQuestions.length; j++) {
					var col = multiRowSetQuestions[j];
					if (row[col.getName()])
						col.setValue(row[col.getName()]);
					else
						col.setValue("");
					if (col.getType() == 29 && row[col.getName()]) {
						var parts = [];
						parts = this.parseDurationToParts(row[col.getName()]);
						var d = parseInt(parts[0]);
						var h = parseInt(parts[1]);
						var m = parseInt(parts[2]);
						var s = parseInt(parts[3]);
						var displayValue = '';
						displayValue += (d > 0 ? d + ' ' : '') + h + ":" + m + ":" + s;
						rowVal[col.getName()] = displayValue;
					}
					else if (col.getType() == 9 || col.getType() == 10)
						rowVal[col.getName()] = col.getValue();
					else
						rowVal[col.getName()] = col.getDisplayValue();
				}
				resultArr.push(rowVal);
			}
		}
		return JSON.stringify(resultArr);
	},

	parseDurationToParts : function(value) {
		var MS_IN_DAY = 86400000;
		var parts = value.split(" ");
		if (parts.length == 2) {
			var times = parts[1].split(":");
			for (var i = 0; i < times.length; i++)
				parts[1 + i] = times[i];
			var dateParts = parts[0].split("-");
			if (dateParts.length == 3)
				// coming from existing record: "1970-01-05
				// 00:05:00"
				parts[0] = parseInt(Date.parse(dateParts[1]
						+ '/' + dateParts[2] + '/'
						+ dateParts[0] + ' 00:00:00 UTC'))
						/ MS_IN_DAY;
		}

		return parts;
	},
	copyAttachment : function(attachmentId, targetTable, targetId) {
		var gr = new GlideRecord("sys_attachment");
		if (GlideStringUtil.isEligibleSysID(attachmentId) && gr.get(attachmentId)) {
			var sysAttach = new GlideSysAttachment();
			return sysAttach.write(targetId, targetTable, gr.getValue('file_name'), gr.getValue('content_type'), sysAttach.getContentStream(gr.getUniqueValue()));
		}
		return '';
	},
    type: 'VariableUtil'
};
```