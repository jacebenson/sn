---
title: "SLATimeline"
id: "slatimeline"
---

API Name: global.SLATimeline

```js
var SLATimeline = Class.create();
SLATimeline.prototype = Object.extendsObject(AbstractTimelineSchedulePage, {
    STATE_IN_PROGRESS : 'in_progress',
    STATE_PAUSED      : 'paused',
    STATE_CANCELLED   : 'cancelled',
    STATE_COMPLETED   : 'completed',
    SLA_RETROACTIVE_PAUSE: 'com.snc.sla.retroactive_pause',
    SLA_CONDITION_FIELD_ORDER: ['start_condition', 'stop_condition', 'reset_condition', 'cancel_condition', 'pause_condition', 'resume_condition'],
    SLA_CONDITION_FIELDS: {'start_condition' : gs.getMessage("Start"), 'cancel_condition' : gs.getMessage("Cancel"),
                           'pause_condition' : gs.getMessage("Pause"), 'resume_condition' : gs.getMessage("Resume"),
                           'stop_condition' : gs.getMessage("Stop"), 'reset_condition' : gs.getMessage("Reset"),
                           'service_commitment' : gs.getMessage("Service Commitment")},
    SLA_CONDITION_FUNCTIONS: {'attach' : gs.getMessage("Attach"), 'pause' : gs.getMessage("Pause"),
                              'resume' : gs.getMessage("Resume"), 'complete' : gs.getMessage("Complete"),
                              'cancel' : gs.getMessage("Cancel"), 'reattach' : gs.getMessage("Reattach")},
    SLA_CONDITION_FUNCTIONS_ORDER: ['attach', 'complete', 'reattach', 'cancel', 'pause', 'resume'],
    CONDITION_MATCH_IMAGE: '<span><img style="padding: 2px 3px 4px 8px" src="/images/icon_availability_up.gifx"></span>',
    CONDITION_NO_MATCH_IMAGE: '<span><img style="padding: 2px 3px 4px 8px" src="/images/icon_availability_down.gifx"></span>',
    CONDITION_IGNORE_IMAGE: '<span><img style="padding: 2px 3px 4px 8px" src="/images/icon_availability_unknown.gifx"></span>',



    getItems : function() {
        this._getParameters();
        this._getRecords();
        var i18nMsg1 = gs.getMessage("(Service Offering SLA) ");
        var soc = (this.slaGR.isValidField('sys_class_name') && this.slaGR.getValue('sys_class_name') === 'service_offering_sla') ?  i18nMsg1 : "";
        if (this.slaGR && this.taskGR){
            this.setPageTitle(this.slaGR.getDisplayValue() + " " + soc + this.taskGR.getDisplayValue());
            this._renderAll();
        }
    },

    _getParameters : function() {
        this.sla = this.getParameter("sysparm_timeline_sla");
        this.task = this.getParameter("sysparm_timeline_task");
        this.items = {};
        this.count = 0;
        this.sla_cur = null;
        this.task_slas = {};
        this.stateChanges = {};
    },

    _getRecords : function() {
        var task = new GlideRecord("task");
        task.get(this.task);
        if (task.isValidRecord())
            this.taskGR = task;

        var sla = new GlideRecord("contract_sla");
        sla.get(this.sla);
        if (sla.isValidRecord()) {
            this.slaGR = sla;
            this.emptySLAConditions = {};
            for (var conditionFieldName in this.SLA_CONDITION_FIELDS)
                if (sla[conditionFieldName].nil())
                    this.emptySLAConditions[conditionFieldName] = true;

            this.ignoreSLAConditions = {};
            if (sla.when_to_resume + '' !== "on_condition")
                this.ignoreSLAConditions["resume_condition"] = true;
            if (sla.when_to_cancel + '' !== "on_condition")
                this.ignoreSLAConditions["cancel_condition"] = true;

            var serviceOfferingField = gs.getProperty(this.SLA_SERVICE_OFFERING, 'cmdb_ci');
            var soc = new GlideRecord("service_offering_commitment");
            if (!soc.isValid() || !task.getValue(serviceOfferingField) )
                this.ignoreSLAConditions["service_commitment"] = true;

            // Reread the task record with the correct table (like incident or change_request)
            task = new GlideRecord(sla.collection);
            task.get(this.task);
            if (task.isValidRecord())
                this.taskGR = task;
        }

        this.scheduleGR = new SLATimelineAPI().getScheduleGR(this.sla, this.task);
        this.schedule = this.scheduleGR.getID();
    },

    _renderAll : function() {
        this.auditItem = new GlideTimelineItem('task', this.task);
        this.auditItem.setLeftLabelText(gs.getMessage("Task History"));
        var gr = this._renderAudits();

        //render schedule
        if (this.schedule)
            this._getScheduleTimeline(gr);

        //render task sla timelines
        for (var i = 1; i <= this.count;i++) {
            var slaItem = new GlideTimelineItem('task_sla', this.items[i]);
            slaItem.setParent(this.task);

            var list = this.task_slas[i];
            var prev = [new GlideDuration(0),new GlideDuration(0)];
            this.rel_end_date = null;
            if (this.slaGR.duration_type) {
                var timelineAPI = new SLATimelineAPI();
                this.rel_end_date = timelineAPI.getRelDurationEndDate(list[1].time, this.taskSLAGR, this.taskGR);
            }

            for (var j = 1; j < list.length - 1; j++) {
                if (list[j].time === list[j+1].time || list[1].time > list[j+1].time)
                    continue;
                list[j].time = (list[j].time > list[1].time) ? list[j].time: list[1].time;
                //get timeline span by schedule
                prev = this._splitBySchedule(list[j], list[j+1],slaItem, prev,new GlideDateTime(list[0]));
            }
            if(list[1].time > list[list.length-1].time){
                var auditSpan = slaItem.createTimelineSpan("task_sla" + i, "");
                auditSpan.setSpanText(gs.getMessage("Expected start"));
                var exp_time = new GlideDateTime(list[1].time).getNumericValue();
                auditSpan.setTimeSpan(exp_time,exp_time);
            }
            slaItem.setLeftLabelText(gs.getMessage("Task SLA {0} ({1})", [i, prev[0].getDisplayValue()]));
            this.add(slaItem);
        }
        this.add(this.auditItem);
    },

    _splitBySchedule : function(list1, list2, slaItem, prev, sla_created) {
        //split by schedule
        if (this.schedule) {
            var timeSpans = this.scheduleGR.getSpans(new GlideDateTime(list1['time']),new GlideDateTime(list2['time']));
			var start_time;
			var end_time;
            if (timeSpans.size() > 0) {
                start_time = timeSpans.get(0).getStart().getGlideDateTime();
                if (start_time > new GlideDateTime(list1['time'])) {
                    if (list1.state === this.STATE_PAUSED)
                        this._createPauseSpan(slaItem, new GlideDateTime(list1.time), start_time, prev,sla_created, false);
                    else if (list1.state === this.STATE_IN_PROGRESS)
                        prev = this._createTimeSpan(slaItem, new GlideDateTime(list1['time']), start_time, prev, sla_created, false);
                }
            }
            for (var i = 0; i < timeSpans.size(); i++) {
                start_time = timeSpans.get(i).getStart().getGlideDateTime();
                end_time = timeSpans.get(i).getEnd().getGlideDateTime();
                if (list1.state === this.STATE_PAUSED)
                    this._createPauseSpan(slaItem, start_time, end_time, prev,sla_created, true);
                else if (list1.state === this.STATE_IN_PROGRESS)
                    prev = this._seperateByBreach(slaItem, start_time, end_time, prev, sla_created);

                if (i < timeSpans.size() -1) {
                    if (list1.state === this.STATE_PAUSED)
                        this._createPauseSpan(slaItem, end_time, timeSpans.get(i+1).getStart().getGlideDateTime(), prev,sla_created, false);
                    else if (list1.state === this.STATE_IN_PROGRESS)
                        prev = this._createTimeSpan(slaItem, end_time, timeSpans.get(i+1).getStart().getGlideDateTime(), prev,sla_created, false);
                }
            }
            if (timeSpans.size() > 0) {
                end_time = timeSpans.get(timeSpans.size()-1).getEnd().getGlideDateTime();
                if (end_time < new GlideDateTime(list2['time'])){
                    if (list1.state === this.STATE_PAUSED)
                        this._createPauseSpan(slaItem, end_time, new GlideDateTime(list2.time), prev,sla_created, false);
                    else if (list1.state === this.STATE_IN_PROGRESS)
                        prev = this._createTimeSpan(slaItem, end_time, new GlideDateTime(list2['time']), prev, sla_created, false);
                }
            }
            else if (timeSpans.size() === 0){
                if (list1.state === this.STATE_PAUSED)
                    this._createPauseSpan(slaItem, new GlideDateTime(list1.time), new GlideDateTime(list2.time), prev,sla_created, false);
                else if (list1.state === this.STATE_IN_PROGRESS)
                    prev = this._createTimeSpan(slaItem, new GlideDateTime(list1['time']), new GlideDateTime(list2['time']), prev, sla_created, false);
            }

        } else {//no need to split by schedule
            if (list1.state === this.STATE_PAUSED)
                this._createPauseSpan(slaItem, new GlideDateTime(list1.time), new GlideDateTime(list2.time), prev,sla_created, true);
            else if (list1.state === this.STATE_IN_PROGRESS)
                prev = this._seperateByBreach(slaItem, new GlideDateTime(list1['time']), new GlideDateTime(list2['time']), prev, sla_created);
        }
        return prev;
    },

    _seperateByBreach : function(slaItem, start_time, end_time, prev, sla_created) {
        var cur_bs = prev[0].add(GlideDateTime.subtract(start_time, end_time));
        var mid_breach = true;
        if (!this.slaGR.duration_type && (cur_bs.getValue() <= new GlideDateTime(this.slaGR.duration) ||prev[0].getValue() >= new GlideDateTime(this.slaGR.duration)))
            mid_breach = false;
        else if (this.slaGR.duration_type)
            mid_breach = !(start_time > this.rel_end_date || end_time < this.rel_end_date);

        if (!mid_breach)
            prev = this._createTimeSpan(slaItem, start_time, end_time, prev ,sla_created, true);
        //if breach in middle
        else {
            var mid_time;
            if (!this.slaGR.duration_type) {
                var duration = this.slaGR.duration.getGlideObject();
                mid_time =  new GlideDateTime(start_time);
                mid_time.add(duration.subtract(prev[0]));
            }else
                mid_time = this.rel_end_date;
            prev = this._createTimeSpan(slaItem, start_time, mid_time ,prev, sla_created, true);
            prev = this._createTimeSpan(slaItem, mid_time, end_time ,prev, sla_created, true);
        }
        return prev;
    },

    //for paused state
    _createPauseSpan : function(slaItem, start_time, end_time, prev,sla_created, in_business) {
        var auditSpan = slaItem.createTimelineSpan("task_sla", "");
        auditSpan.setTimeSpan(start_time.getNumericValue(), end_time.getNumericValue());
        if (in_business) {
            auditSpan.setSpanText(gs.getMessage("Stage: Paused"));
            auditSpan.setSpanColor("DimGray");
        }
        else
            auditSpan.setSpanColor("DarkGray");
		var i18nStagePaused = gs.getMessage("Stage: Paused");
		var i18nPauseFrom = gs.getMessage("Pause From: {0}", start_time.getDisplayValue());
		var i18nPauseDuration = gs.getMessage("Pause Duration: {0}", GlideDateTime.subtract(start_time, end_time).getDisplayValue());
		var i18nAET = gs.getMessage("Actual elapsed time:  + 0 ({0})", prev[1].getDisplayValue());
		var i18nEBT = gs.getMessage("Elapsed business time:  + 0 ({0})", prev[0].getDisplayValue());

        var toolTip = i18nStagePaused + "</br>" + i18nPauseFrom + "</br>" + i18nPauseDuration
            + "</br>" + i18nAET + "</br>"
            + i18nEBT;

        if (end_time <= sla_created) {
            var i18nRBT = gs.getMessage("Retroactive business time:  + 0 ({0})", prev[0].getDisplayValue());
            toolTip += "</br>" + i18nRBT;
            }
        auditSpan.setTooltip(toolTip);
    },

    _createTimeSpan : function(slaItem, start_time, end_time, prev, sla_created, in_business) {
        var auditSpan = slaItem.createTimelineSpan("task_sla", "");
        auditSpan.setTimeSpan(start_time.getNumericValue(), end_time.getNumericValue());
        var total_spantime = GlideDateTime.subtract(start_time, end_time);
        prev[1] = prev[1].add(total_spantime);
        var spantime = new GlideDuration(0);
        var cur_bs = prev[0];
        var toolTip = gs.getMessage('Stage: In Progress');

        var has_breached = false;
        if (in_business) {
            spantime = total_spantime;
            cur_bs = prev[0].add(spantime);
        }
        if (!this.slaGR.duration_type)
            has_breached = (cur_bs.getValue() > new GlideDateTime(this.slaGR.duration));
        else
            has_breached = (end_time > this.rel_end_date);

        if (in_business) {
            //check breach
            if (has_breached) {
                auditSpan.setSpanColor("Red");
                auditSpan.setSpanText(gs.getMessage('Stage: In Progress (Breached)'));
            }
            else {
                auditSpan.setSpanColor("Green");
                auditSpan.setSpanText(gs.getMessage('Stage: In Progress'));
            }
        } else {
            var i18nOutOfSchedule = gs.getMessage(" (Out of schedule)");
            toolTip += i18nOutOfSchedule;
            if (has_breached)
                auditSpan.setSpanColor("IndianRed");
            else
                auditSpan.setSpanColor("LightGreen");
        }
		var i18nAET = gs.getMessage("Actual elapsed time:  + {0} ({1})", [total_spantime.getDisplayValue(), prev[1].getDisplayValue()]);
		var i18nEBT = gs.getMessage("Elapsed business time:  + {0} ({1})", [spantime.getDisplayValue(), cur_bs.getDisplayValue()]);
		toolTip += "</br>" + i18nAET + "</br>" + i18nEBT;
        //check whether in retroactive timespan
		if (start_time < sla_created) {
			if (in_business && end_time > sla_created)
				spantime = GlideDateTime.subtract(start_time, sla_created);
			var retr_sum = prev[0].add(spantime);
			var i18nRBT = gs.getMessage("Retroactive business time:  + {0} ({1})", [spantime.getDisplayValue(), retr_sum.getDisplayValue()]);
			auditSpan.setInnerSegmentTimeSpan(start_time.getNumericValue(), sla_created.getNumericValue());
			toolTip += "</br>" + i18nRBT;
        }
        auditSpan.setTooltip(toolTip);
        prev[0] = cur_bs;
        return prev;
    },

    _getScheduleTimeline : function(gr) {
        var auditItem = new GlideTimelineItem('cmn_schedule', '');
        auditItem.setLeftLabelText(this.scheduleGR.getName());

        var startTime = new GlideScheduleDateTime(gr.sys_created_on);
        var endTime = new GlideScheduleDateTime(gr.sys_updated_on);
        var timeSpans = this.scheduleGR.getSpans(startTime.getGlideDateTime(),endTime.getGlideDateTime());
        for (var i = 0; i < timeSpans.size();i++) {
            var auditSpan = auditItem.createTimelineSpan("schedule","");
            auditSpan.setTimeSpan(timeSpans.get(i).getStart().getMS(),timeSpans.get(i).getEnd().getMS());
            auditSpan.setIsBaseline(true);
        }
        this.add(auditItem);
    },

    _renderAudits : function() {
        var historyGR = this._buildHistory();
        var stage = 0;
        var sysUpdatedOn;
        var gr = new GlideRecord(this.taskGR.sys_class_name);
        var task_changes = "";
        var taskSLA;
        this.sla_conditions = {"start_condition" : false, "stop_condition" : false, "cancel_condition" : false, "reset_condition" : false, "pause_condition" : false, "resume_condition" : false, "service_commitment" : false};
        this.alreadyAttached = {};
        while (historyGR.next()) {
            if (parseInt(historyGR.getValue("update")) !== stage) {
                if (sysUpdatedOn && stage === 0)
                    gr.setValue('sys_created_on', sysUpdatedOn);
                gr.setValue('sys_updated_on', sysUpdatedOn);

                taskSLA = this._updateState(taskSLA, gr, false);
                this._getSpan(gr, task_changes, taskSLA);
                task_changes = "";
                stage = historyGR.getValue("update") - 0;
            }
            task_changes += this._generateTaskChange(historyGR);
            if (historyGR.getValue("new_value"))
                gr.setValue(historyGR.getValue("field"), historyGR.getValue("new_value"));
            else
                gr.setValue(historyGR.getValue("field"), historyGR.getValue("new"));
            sysUpdatedOn = historyGR.getValue('update_time');
        }
        if (stage === 0)
            gr.setValue('sys_created_on', sysUpdatedOn);
        gr.setValue('sys_updated_on', sysUpdatedOn);

        taskSLA = this._updateState(taskSLA, gr, false);
        this._getSpan(gr, task_changes, taskSLA);

        if (taskSLA && (taskSLA.getValue('stage') === this.STATE_PAUSED || taskSLA.getValue('stage') === this.STATE_IN_PROGRESS)) {
            gr.setValue('sys_updated_on',new GlideDateTime());
            this.task_slas[this.count].push({"state" : taskSLA.getValue('stage'), "time" : gr.getValue("sys_updated_on")});
        }
        return gr;
    },

    _updateState: function(taskSLA, gr, retroactive) {
        var slaTimelineAPI;
		var start_time;
		var created_stage;
        if (taskSLA) {
            var previousState = taskSLA.getValue('stage');
            slaTimelineAPI = new SLATimelineAPI(taskSLA,gr);
            slaTimelineAPI.checkExistingSLA(retroactive);
            taskSLA = slaTimelineAPI.getTaskSLA();
            if (taskSLA.getValue('stage') !== this.stage)
                this.task_slas[this.count].push({"state" : taskSLA.getValue('stage'), "time" : gr.getValue('sys_updated_on')});
            if (!retroactive && !slaTimelineAPI.getNewTaskSLA())
                this.stateChanges[this.count].push({"previousState" : previousState, "state" : taskSLA.getValue('stage'), stateChanges : slaTimelineAPI.getStateChanges()});
        } else {
            slaTimelineAPI = new SLATimelineAPI(this.slaGR, gr);
            taskSLA = slaTimelineAPI.getTaskSLA();
            if (taskSLA) {
                slaTimelineAPI.checkExistingSLA(true);
                taskSLA = slaTimelineAPI.getTaskSLA();
                this.taskSLAGR = taskSLA;
                this.count += 1;
                this.sla_cur = this.count;
                this.task_slas[this.count] = [];
                this.stateChanges[this.count] = [];
                this.task_slas[this.count].push(gr.getValue("sys_updated_on"));
                start_time = (this.slaGR.retroactive && gr.getValue(this.slaGR.set_start_to)) ? gr.getValue(this.slaGR.set_start_to) : gr.getValue("sys_updated_on");
                created_stage = this.slaGR.retroactive ? this.STATE_IN_PROGRESS : taskSLA.getValue('stage');
                this.task_slas[this.count].push({"state" : created_stage, "time" : start_time});
                this.stateChanges[this.count].push({"previousState" : "", "state" : taskSLA.getValue('stage'), stateChanges : slaTimelineAPI.getStateChanges()});
                if (!retroactive && this.slaGR.retroactive && this.slaGR.retroactive_pause)
                    this._updateHistory(gr,taskSLA);
				if (taskSLA.getValue('stage') !== created_stage)
					this.task_slas[this.count].push({"state" : taskSLA.getValue('stage') , "time" : gr.getValue("sys_updated_on")});
            }
        }

        if(slaTimelineAPI.getNewTaskSLA()){
            taskSLA = slaTimelineAPI.getNewTaskSLA();
            if (taskSLA) {
				var currentStateChanges = slaTimelineAPI.getStateChanges();
				currentStateChanges["attach"] = true;
                slaTimelineAPI = new SLATimelineAPI(taskSLA, gr);
                slaTimelineAPI.setStateChanges(currentStateChanges);
				slaTimelineAPI.setProcessReset();
                slaTimelineAPI.checkExistingSLA(true);
                taskSLA = slaTimelineAPI.getTaskSLA();
                this.taskSLAGR = taskSLA;
                this.count += 1;
                this.sla_cur = this.count;
                this.task_slas[this.count] = [];
                this.stateChanges[this.count] = [];
                this.task_slas[this.count].push(gr.getValue("sys_updated_on"));
                start_time = (this.slaGR.retroactive && gr.getValue(this.slaGR.set_start_to)) ? gr.getValue(this.slaGR.set_start_to) : gr.getValue("sys_updated_on");
                created_stage = this.slaGR.retroactive ? this.STATE_IN_PROGRESS : taskSLA.getValue('stage');
                this.task_slas[this.count].push({"state" : created_stage, "time" : start_time});
                this.stateChanges[this.count].push({"previousState" : "", "state" : taskSLA.getValue('stage'), stateChanges : slaTimelineAPI.getStateChanges()});

                if (this.slaGR.retroactive && this.slaGR.retroactive_pause)
                    this._updateHistory(gr, taskSLA);

				if (taskSLA.getValue('stage') !== created_stage)
					this.task_slas[this.count].push({"state" : taskSLA.getValue('stage') , "time" : gr.getValue("sys_updated_on")});
            }
        }

        if (taskSLA) {
            if (taskSLA.getValue('stage') === this.STATE_CANCELLED || taskSLA.getValue('stage') === this.STATE_COMPLETED) {
                this.stage = '';
                taskSLA = null;
            } else
                this.stage = taskSLA.getValue('stage');
        }
        return taskSLA;
    },

    //revert history in case of retroactive sla
    _updateHistory : function(task, taskSLA){
		// When calculating for retroactive pause we need the initial SLA stage to be "In progress" to make sure
		// we get the correct initial stage on the SLA
		this.stage = this.STATE_IN_PROGRESS;

		var historyGR = this._buildHistory();
        var stage = 0;
        var sysUpdatedOn;
        var gr = new GlideRecord(this.taskGR.sys_class_name);
        var final_state = true;
        while (historyGR.next()) {
            if (parseInt(historyGR.getValue("update")) !== stage) {
                if (sysUpdatedOn && stage === 0)
                    gr.setValue('sys_created_on', sysUpdatedOn);
                gr.setValue('sys_updated_on', sysUpdatedOn);
                taskSLA = this._updateState(taskSLA,gr, true);
                stage = historyGR.getValue("update") - 0;
            }
            if (historyGR.getValue('update_time') > task.getValue('sys_updated_on')){
                final_state = false;
                break;
            }
            if (historyGR.getValue("new_value"))
                gr.setValue(historyGR.getValue("field"), historyGR.getValue("new_value"));
            else
                gr.setValue(historyGR.getValue("field"), historyGR.getValue("new"));
            sysUpdatedOn = historyGR.getValue('update_time');
        }
        if (final_state){
            if (sysUpdatedOn && stage === 0)
                gr.setValue('sys_created_on', sysUpdatedOn);
            gr.setValue('sys_updated_on', sysUpdatedOn);
            taskSLA = this._updateState(taskSLA,gr, true);
        }
    },

    //generate audit history changes
    _generateTaskChange : function(historyGR) {
        if (!this.taskGR[historyGR.getValue("field")].canRead())
            return "";

        var tc = "<strong>" + historyGR.getValue("label") + "</strong>: " + historyGR.getDisplayValue("new") + '<br />';
        return tc;
    },

    //get timeline span content
    _getSpan : function(gr, task_changes) {
        var slaTimelineAPI = new SLATimelineAPI();
        var aConditionChanged = false;
        var sla_conditions = this.sla_conditions;
        var toolTip_conditions = {};

        for (var conditionField in this.SLA_CONDITION_FIELDS) {
            if (this.ignoreSLAConditions[conditionField])
                continue;

            // Service commitment is a special case
            if (conditionField === 'service_commitment') {
                var soc = slaTimelineAPI.getServOfStatus(this.slaGR, gr);
                if (soc)
                    toolTip_conditions[conditionField] = this.CONDITION_MATCH_IMAGE + this.SLA_CONDITION_FIELDS[conditionField];
                else
                    toolTip_conditions[conditionField] = this.CONDITION_NO_MATCH_IMAGE + this.SLA_CONDITION_FIELDS[conditionField];

                if (soc !== this.sla_conditions[conditionField]) {
                    aConditionChanged = true;
                    this.sla_conditions[conditionField] = sla_conditions[conditionField];
                }

                continue;
            }

            if (this.emptySLAConditions[conditionField]) {
                sla_conditions[conditionField] = false;
                toolTip_conditions[conditionField] = this.CONDITION_IGNORE_IMAGE + this.SLA_CONDITION_FIELDS[conditionField];
                continue;
            }

			var condition = this.slaGR.getValue(conditionField);
            if (!condition)
                sla_conditions[conditionField] = false;
            else
                sla_conditions[conditionField] = GlideFilter.checkRecord(gr, condition);

            if (sla_conditions[conditionField] !== this.sla_conditions[conditionField]) {
                aConditionChanged = true;
                this.sla_conditions[conditionField] = sla_conditions[conditionField];
            }

            if (sla_conditions[conditionField])
                toolTip_conditions[conditionField] = this.CONDITION_MATCH_IMAGE + this.SLA_CONDITION_FIELDS[conditionField];
            else
                toolTip_conditions[conditionField] = this.CONDITION_NO_MATCH_IMAGE + this.SLA_CONDITION_FIELDS[conditionField];             
        }

        var auditSpan = this.auditItem.createTimelineSpan("task", "");
        var timespan = gr.sys_updated_on.getGlideObject().getNumericValue();
        auditSpan.setTimeSpan(timespan, timespan);

        var toolTip;

        // Get the current task_sla, it's state and whether it is active
        var stateChanges;
        var latestStateChanges;

        if (this.stateChanges && this.count) {
            stateChanges = this.stateChanges[this.count];
            latestStateChanges = stateChanges[stateChanges.length - 1].stateChanges;
        }

		if ((latestStateChanges && !latestStateChanges.processed) || aConditionChanged) {
			var i18nMsg = gs.getMessage('SLA Definition conditions:');
			toolTip = i18nMsg + "</br>";

			for (var i = 0; i < this.SLA_CONDITION_FIELD_ORDER.length; i++) {
				var conditionFieldName = this.SLA_CONDITION_FIELD_ORDER[i];
				if (toolTip_conditions[conditionFieldName])
					toolTip += toolTip_conditions[conditionFieldName] + " ";
			}
			toolTip += "</br></br>";

			var slac = slaTimelineAPI.newSLACondition(this.slaGR, gr);

			// Walk through the same condition checks that TaskSLAController would do which
			// may mean we don't test one or more functions e.g. if we match complete we'll never test cancel or pause/resume
			//
			// Initialize all condition functions as ignored
			var i18nSLACondition = gs.getMessage('SLA condition rule ({0})', slac.type);
			toolTip += i18nSLACondition + ':</br>';

			// Task SLA isn't completed, reset or cancelled so we can test resume/pause
			for (var j = 0; j < this.SLA_CONDITION_FUNCTIONS_ORDER.length; j++) {
				var conditionFunction = this.SLA_CONDITION_FUNCTIONS_ORDER[j];
				if (latestStateChanges && typeof latestStateChanges[conditionFunction] !== "undefined") {
					if (latestStateChanges[conditionFunction])
						toolTip += this.CONDITION_MATCH_IMAGE + this.SLA_CONDITION_FUNCTIONS[conditionFunction] + '  ';
					else
						toolTip += this.CONDITION_NO_MATCH_IMAGE + this.SLA_CONDITION_FUNCTIONS[conditionFunction] + '  ';
				} else
					toolTip += this.CONDITION_IGNORE_IMAGE + this.SLA_CONDITION_FUNCTIONS[conditionFunction] + '  ';
		    }

			toolTip += "</br></br>";

			latestStateChanges.processed = true;
		} else
			toolTip = gs.getMessage("No SLA stage change</br>");

        //check whether there is task_sla record
        if (this.sla_cur) {
            var tsl = new GlideRecord("task_sla");
            tsl.addQuery("task", this.taskGR.sys_id);
            tsl.addQuery("sla", this.slaGR.sys_id);
            tsl.addQuery("sys_created_on", ">=", gr.sys_updated_on);
            tsl.addQuery("end_time", ">=", gr.sys_updated_on).addOrCondition("end_time","") ;
            tsl.query();
            if (!tsl.next()) {
                var i18nTaskSLASim = gs.getMessage("Task SLA for simulation.");
                toolTip += i18nTaskSLASim + "</br>";
                this.items[this.count] = 'simulation';
            } else
                this.items[this.count] = tsl.getUniqueValue();
            var i18nTaskSLA = gs.getMessage("Task SLA {0}", this.sla_cur);
            var task_sla = gs.getMessage("{0} activated.", i18nTaskSLA);
            if(this.slaGR.retroactive) {
                var i18nMsg1 = gs.getMessage(" However, it is setup to be retroactive from {0}.", this.taskGR[this.slaGR.getValue("set_start_to")].getLabel());
                task_sla += i18nMsg1;
            }
            auditSpan.setTooltip(toolTip + task_changes);
            auditSpan.setSpanText(task_sla);
            this.sla_cur = null;
        } else
            auditSpan.setTooltip(toolTip + task_changes);
    },

    _buildHistory : function() {
        var hs = new GlideHistorySet(this.taskGR);
        var hs_sys_id = hs.generate();
        var historyGR = new GlideRecord('sys_history_line');
        historyGR.addQuery('set', hs_sys_id);
        historyGR.addQuery('type','audit').addOrCondition('type','');
        historyGR.orderBy('update');
        historyGR.query();
        return historyGR;
    },

	/**
	* Prevent public access to this processor
	*/
	isPublic: function() {
		return false;
	},

    type: 'SLATimeline'
});
```