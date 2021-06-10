---
title: "NoteTemplate"
id: "notetemplate"
---

API Name: sn_templated_snip.NoteTemplate

```js
var NoteTemplate = Class.create();
NoteTemplate.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

    ajaxSetTemplateVariables: function() {
        var template = this.getParameter("sysparm_template");
        var tableName = this.getParameter("sysparm_table_name");
        var tableSysId = this.getParameter("sysparm_table_sys_id");

        return this.setTemplateVariables(template, tableName, tableSysId);

    },

    setTemplateVariables: function(template, tableName, tableSysId) {
        var matched = template.match(/\${([^}]*)}/g);
        var gr = new GlideRecord(tableName);

        if (gr.get(tableSysId)) {
            for (var i in matched) {
                var element = gr;
                var field;
                var str = matched[i].match(/\${(.*)}/).pop();
                str = str.trim();
                if (!str)
                    continue;
                var references = str.split(/[\.]+/g);
                for (var j = 0; j < references.length; j++) {
                    field = references[j];
                    if (j == references.length - 1)
                        break;
                    if (element != null && element.isValidField(field)) {
                        if (element.getElement(field).canRead())
                            element = element.getElement(field).getRefRecord();
                        else {
                            template = template.replace(matched[i], "<font color='#ff0000'>" + matched[i] + "</font>");
                            break;
                        }
                    } else
                        break;
                }
                if (element != null && element.isValidField(field)) {
                    if (element.getElement(field).canRead())
                        template = template.replace(matched[i], element.getDisplayValue(field));
                    else
                        template = template.replace(matched[i], "<font color='#ff0000'>" + matched[i] + "</font>");

                } else if (field == "Date") {
                    var currentTime = new GlideDateTime();
                    currentTime = currentTime.getDisplayValue().toString();
                    currentTime = currentTime.split(" ");
                    var currentDate = currentTime[0];

                    template = template.replace(matched[i], currentDate);
                } else if (field == "current_user") {
					template = template.replace(matched[i], gs.getUserDisplayName());
				} else
                    template = template.replace(matched[i], "<font color='#ff0000'>" + matched[i] + "</font>");

            }

        }

        return template;
    },

    validateTemplate: function(parsedBody, tableName) {
        var unEvaluatedVariable = [];
        var inaccessibleVariable = [];

        if (!tableName)
            return parsedBody;
        else {
            parsedBody = this.resetErroredSpanInDocument(parsedBody);
            var regex = /\${([^}]*)}/g;
            var matched = parsedBody.match(regex);
            var gr = new GlideRecord(tableName);
            gr.initialize();
            if (gr) {
                for (var i in matched) {
                    if (unEvaluatedVariable.indexOf(matched[i]) > -1 || inaccessibleVariable.indexOf(matched[i]) > -1 || matched[i] == "${Date}" || matched[i] == "${current_user}")
                        continue;
                    var element = gr;
                    var field;

                    var str = matched[i].match(/\${(.*)}/).pop();
                    str = str.trim();

                    if (!str)
                        continue;
                    var references = str.split(/[\.]+/g);
                    for (var j = 0; j < references.length; j++) {
                        field = references[j];
                        if (j == references.length - 1)
                            break;
                        if (element.isValidField(field)) {
                            if (element.getElement(field).canRead())
                                element = element.getElement(field).getRefRecord();

                            else {
                                parsedBody = parsedBody.replace(matched[i], '<span class="errored-field" style="color:#ff0000;">' + matched[i] + '</span>');
                                inaccessibleVariable.push(matched[i]);
                                break;
                            }
                        } else
                            break;
                    }
                    if (element.isValidField(field)) {
                        if (!element.getElement(field).canRead()) {
                            parsedBody = parsedBody.replace(matched[i], '<span class="errored-field" style="color:#ff0000;">' + matched[i] + '</span>');
                            inaccessibleVariable.push(matched[i]);
                        }
                    } else {
                        if (field == "Date" || field == "current_user")
                            continue;

                        parsedBody = parsedBody.replace(matched[i], '<span class="errored-field" style="color:#ff0000;">' + matched[i] + '</span>');
                        unEvaluatedVariable.push(matched[i]);
                    }
                }
            }
            var result = [];
            result.push(parsedBody);
            result.push(unEvaluatedVariable);
            result.push(inaccessibleVariable);
            return result;

        }
    },

    resetErroredSpanInDocument: function(documentBody) {
        //regular expression that matches all the span pairs in the documentBody with class as errored-field
        var spanRegex = /<\s*span\s*class="errored-field".*?>/g;
        var matchedSpanTags = documentBody.match(spanRegex);
        for (var i in matchedSpanTags) {
            documentBody = documentBody.replace(matchedSpanTags[i], "<span>");
        }
        return documentBody;
    },

    saveToM2MMLTable: function(taskId, templateId) {
        var task = this.getParameter("sysparm_task") || taskId;
        var template = this.getParameter("sysparm_template") || templateId;

        var noteTemplateForTable = new GlideRecord('sn_m2m_note_template_for_table');
        noteTemplateForTable.addQuery('task', task);
        noteTemplateForTable.addQuery('note_template', template);
        noteTemplateForTable.query();

        //if the template selected by User has been applied to the task already, increase the count
        if (noteTemplateForTable.next()) {
            noteTemplateForTable.count = parseInt(noteTemplateForTable.count) + 1;
            var templateUpdate = noteTemplateForTable.update();

			return templateUpdate;
        }

        //if the template selected by User never been applied to the task, insert new record and set count to 1
        noteTemplateForTable.initialize();
        noteTemplateForTable.note_template = template;
        noteTemplateForTable.task = task;
        noteTemplateForTable.count = 1;

        var noteTemplateId = noteTemplateForTable.insert();

		return noteTemplateId;
    },

    type: 'NoteTemplate'
});
```