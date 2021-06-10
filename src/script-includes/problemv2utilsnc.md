---
title: "ProblemV2UtilSNC"
id: "problemv2utilsnc"
---

API Name: global.ProblemV2UtilSNC

```js
var ProblemV2UtilSNC = Class.create();
ProblemV2UtilSNC.prototype = {
    initialize: function(argument) {
        var fixes = gs.getProperty("problem.fix.records");
        if (fixes)
            this.fixTasks = fixes.split(",");
        else
            this.fixTasks = "";
        this.fixTasksMap = this.dotCommaToMap(this.fixTasks);
    },

    dotCommaToMap: function(Arr) {
        var map = {};
        for (var i = 0; i < Arr.length; i++) {
            map[Arr[i].split(".")[0]] = Arr[i].split(".")[1];
        }
        return map;
    },

    isRelatedFix: function(current) {
        if (!current.active.changesTo(false) || !this.fixTasks)
            return false;
        if (!this.fixTasksMap[current.sys_class_name])
            return false;
        if (current.sys_class_name + '' === 'sn_cim_register' && !this.isCIMRelatedToProblem(current))
            return false;
        if (current.sys_class_name + '' !== 'sn_cim_register' && !current[this.fixTasksMap[current.sys_class_name]])
            return false;
        return true;
    },

    isCIMRelatedToProblem: function(current) {
        var gr = new GlideRecord('sn_cim_inbound_m2m');
        gr.addQuery('cim_register', current.getUniqueValue());
        gr.addQuery('source_table', 'problem');
        gr.query();
        return gr.hasNext();
    },

    checkRelatedFixes: function(current) {
        if (current.sys_class_name + '' === 'sn_cim_register')
            this.checkAllProblemsForCIM(current);
        else {
            var problem = current[this.fixTasksMap[current.sys_class_name]].getRefRecord();
            if (!this.hasRemainingFixes(this.fixTasksMap, problem))
                gs.eventQueue('problem.fixes', problem);
        }
    },

    checkAllProblemsForCIM: function(current) {
        var gr = new GlideRecord('sn_cim_inbound_m2m');
        gr.addQuery('cim_register', current.getUniqueValue());
        gr.addQuery('source_table', 'problem');
        gr.query();
        while (gr.next()) {
            var problem = gr.source_id.getRefRecord();
            if (!this.hasRemainingFixes(this.fixTasksMap, problem))
                gs.eventQueue('problem.fixes', problem);
        }
    },

    hasRemainingFixes: function(fixTasksMap, problem) {
        var problemId = problem.getUniqueValue() + '';
        for (var key in fixTasksMap) {
            if (key === 'sn_cim_register' && this._hasCIMRelatedActiveFix(problemId))
                return true;
            if (key !== 'sn_cim_register' && this._hasOthersRelatedActiveFix(key, fixTasksMap[key], problemId))
                return true;
        }
        return false;
    },

    _hasCIMRelatedActiveFix: function(problemId) {
        var gr = new GlideRecord('sn_cim_inbound_m2m');
        if (gr.isValid()) {
            gr.addQuery('source_id', problemId);
            gr.query();
            while (gr.next()) {
                var cimRecord = gr.cim_register.getRefRecord();
                if (cimRecord.active && cimRecord.getUniqueValue() + '' !== problemId)
                    return true;
            }
        }
        return false;
    },

    _hasOthersRelatedActiveFix: function(table, field, problemId) {
        var taskGr = new GlideAggregate(table);
        if (!taskGr.isValid())
            return false;
        taskGr.addQuery('active', true);
        taskGr.addQuery('sys_id', '!=', problemId);
        taskGr.addQuery(field, problemId);
        taskGr.addAggregate('COUNT');
        taskGr.query();
        if (taskGr.next())
            return taskGr.getAggregate('COUNT') > 0;
    },

    moveRecords: function(tableName, problemRelatedField, duplicateProblemGr, originalProblemGr) {
        var gr = new GlideRecord(tableName);
        if (!gr.isValid())
            return false;
        gr.addQuery(problemRelatedField, duplicateProblemGr.getUniqueValue());
        gr.query();
        while (gr.next()) {
            gr.setValue(problemRelatedField, originalProblemGr.getUniqueValue());
            gr.work_notes = gs.getMessage("{0} now associated with {1} based on closure of {2}", [gr.getDisplayValue("sys_class_name"), originalProblemGr.getDisplayValue(), duplicateProblemGr.getDisplayValue()]);
            gr.update();
        }
    },

    type: 'ProblemV2UtilSNC'
};
```