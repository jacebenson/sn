---
title: "SLATimerSNC"
id: "slatimersnc"
---

API Name: sn_slm_timer.SLATimerSNC

```js
var SLATimerSNC = Class.create();

SLATimerSNC.LOG_PROP = 'com.snc.sla.timer.log';
SLATimerSNC.FIRST_TO_BREACH = 1;
SLATimerSNC.MAPPING = 2;
SLATimerSNC.INVALID_IDS = 'invalid_ids';
SLATimerSNC.INVALID_TASK_IDS = 'invalid_task_ids';
SLATimerSNC.INVALID_CONFIG_IDS = 'invalid_config_ids';
SLATimerSNC.DEFAULT_CONFIG_ID = 'DEFAULT_CONFIG_ID';

SLATimerSNC.prototype = {
	initialize: function(_gr, _gs) {
		this._log = new global.GSLog(SLATimerSNC.LOG_PROP, this.type);

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[initialize] type: ' + this.type);

		this._gr = _gr;
		this._gs = _gs || gs;
		this._slaUtil = new global.SLAUtil();

		this._isTwentyElevenEngine = this._gs.getProperty('com.snc.sla.engine.version', '2010') === '2011';
		this._isBreachCompatibility = this._gs.getProperty('com.snc.sla.compatibility.breach', false) + '' === 'true';

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[initialize] isTwentyElevenEngine: ' + this._isTwentyElevenEngine + ' isBreachCompatibility: ' + this._isBreachCompatibility);
	},

	get: function(params) {
		var timerData = {
			sla_timers: {},
			config: {}
		};

		if (!params)
			return timerData;

		var taskSysIds = params.task_ids || '';
		var configSysIds = params.config_ids || '';

		if (!taskSysIds || (Array.isArray(taskSysIds) && taskSysIds.length < 1))
			return timerData;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[get] taskSysIds: ' + taskSysIds + ' configSysIds: ' + configSysIds);

		var uniqueTaskSysIds = this._uniqueSysIds(taskSysIds);
		var uniqueConfigSysIds = this._uniqueSysIds(configSysIds);

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[get] uniqueTaskSysIds: ' + uniqueTaskSysIds + ' uniqueConfigSysIds: ' + uniqueConfigSysIds);

		var hasValidTaskIds = uniqueTaskSysIds && Array.isArray(uniqueTaskSysIds) && uniqueTaskSysIds.length > 0;
		var hasValidConfigIds = uniqueConfigSysIds && Array.isArray(uniqueConfigSysIds) && uniqueConfigSysIds.length > 0;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[get] hasValidTaskIds: ' + hasValidTaskIds + ' hasValidConfigIds: ' + hasValidConfigIds);

		if (!hasValidTaskIds)
			return timerData;

		// Refresh all Task SLA records
		this._slaUtil.refreshTaskSlasByTask(uniqueTaskSysIds);

		// Get all task SLA data records
		timerData.sla_timers = this._getTaskSlaData(uniqueTaskSysIds);

		// Get all the config data records
		if (!uniqueConfigSysIds || !Array.isArray(uniqueConfigSysIds) || uniqueConfigSysIds.length < 1)
			timerData.config = this._getDefaultConfig(uniqueTaskSysIds);
		else
			timerData.config = this._getConfig(uniqueTaskSysIds, uniqueConfigSysIds);

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[get] timerData: ' + JSON.stringify(timerData));

		return timerData;
	},

	_uniqueSysIds: function(sysIds) {
		sysIds = typeof sysIds === 'string' ? sysIds.split(',') : sysIds;
		sysIds = sysIds.filter(function(element) { return element || false; } );
		return Array.isArray(sysIds) ? sysIds.filter(this.filters.unique) : sysIds;
	},

	// returns first to breach with show complete and cancel both true
	_getDefaultConfig: function(taskSysIds) {

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getDefaultConfig] taskSysIds: ' + taskSysIds);

		var configData = {};

		if (!taskSysIds || !Array.isArray(taskSysIds) || taskSysIds.length < 1)
			return configData;

		configData[SLATimerSNC.DEFAULT_CONFIG_ID] = {
			name: {
				display_value: this._gs.getMessage('DEFAULT Configuration'),
				value: SLATimerSNC.DEFAULT_CONFIG_ID
			}
		};

		taskSysIds.forEach(function(taskSysId) {
			var firstToBreachSysId = this._getFirstToBreach(taskSysId, true, true);
			
			if (firstToBreachSysId)
				configData[SLATimerSNC.DEFAULT_CONFIG_ID][taskSysId] = firstToBreachSysId;
		}, this);

		return configData;
	},

	_getConfig: function(taskSysIds, configSysIds) {

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getConfig] taskSysIds: ' + taskSysIds + ' configSysIds: ' + configSysIds);

		var configData = {};

		if (!taskSysIds || !Array.isArray(taskSysIds) || taskSysIds.length < 1 || !configSysIds || !Array.isArray(configSysIds) || configSysIds.length < 1)
			return configData;

		var validSysIds = [];
		var configGr = new GlideRecord('sla_timer_config');
		configGr.addQuery('sys_id', 'IN', configSysIds);
		configGr.addActiveQuery();
		configGr.query();
		while (configGr.next()) {
			configSysId = configGr.getUniqueValue();

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug('[_getConfig] configSysId: ' + configSysId);

			configData[configSysId] = {};
			var showCompleted = !!(parseInt(configGr.getValue('show_complete')));
			var showCancelled = !!(parseInt(configGr.getValue('show_cancelled')));

			configData[configSysId].name = {
				display_value: configGr.name.getDisplayValue(),
				value: configGr.getValue('name')
			};

			var slaTimeSource = configGr.getValue('sla_timer_source');

			if (!isNaN(slaTimeSource))
				slaTimeSource = parseInt(slaTimeSource);

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug('[_getConfig] slaTimeSource: ' + slaTimeSource);

			if (slaTimeSource === SLATimerSNC.FIRST_TO_BREACH)
				taskSysIds.forEach(function(taskSysId) {
					var firstToBreachSysId = this._getFirstToBreach(taskSysId, showCompleted, showCancelled);
					
					if (firstToBreachSysId)
						configData[configSysId][taskSysId] = firstToBreachSysId;
				}, this);
			else if (slaTimeSource === SLATimerSNC.MAPPING)
				taskSysIds.forEach(function(taskSysId) {
					var mappedTaskSlaSysId = this._getMapping(configSysId, taskSysId, showCompleted, showCancelled);
					
					if(mappedTaskSlaSysId)
						configData[configSysId][taskSysId] = mappedTaskSlaSysId;
				}, this);
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getConfig] configData: ' + JSON.stringify(configData));

		return configData;
	},

	_getTaskSlaData: function(taskSysIds) {
		var slaTimerData = {};
		var taskSlaGr = new GlideRecord('task_sla');
		taskSlaGr.addQuery('task', 'IN', taskSysIds);
		taskSlaGr.query();
		while (taskSlaGr.next()) {
			if (taskSlaGr.canRead()) {
				var taskSlaSysId = taskSlaGr.getUniqueValue();

				slaTimerData[taskSlaSysId] = {};

				slaTimerData[taskSlaSysId].sys_id = {
					value: taskSlaSysId,
					display_value: taskSlaGr.getDisplayValue()
				};

				slaTimerData[taskSlaSysId].task = {
					value: taskSlaGr.getValue('task'),
					display_value: taskSlaGr.task.getDisplayValue()
				};

				var scheduleData = this._slaUtil.getScheduleData(taskSlaGr);

				var durationType = taskSlaGr.sla.duration_type + '';
				var fullDurationInMillis;
				// Duration type returns sys_id of relative duration if one is chosen or null for user specified duration
				if (durationType) {
					// support property com.snc.sla.always_populate_business_fields=false
					var elapsedTimeInMillis = scheduleData ? this._durationInMillis(taskSlaGr.getValue('business_duration')) : this._durationInMillis(taskSlaGr.getValue('duration'));
					var remainingTimeInMillis = scheduleData ? this._durationInMillis(taskSlaGr.getValue('business_time_left')) : this._durationInMillis(taskSlaGr.getValue('time_left'));
					fullDurationInMillis = elapsedTimeInMillis + remainingTimeInMillis;
				} else
					fullDurationInMillis = this._durationInMillis(taskSlaGr.sla.duration + '');

				slaTimerData[taskSlaSysId].duration = {
					value: fullDurationInMillis,
					display_value: fullDurationInMillis
				};

				// support property com.snc.sla.always_populate_business_fields=false
				var timeLeftValue = this._durationInMillis(taskSlaGr.getValue('time_left'));
				var timeLeftDisplayValue = taskSlaGr.time_left.getDisplayValue();
				if (scheduleData) {
					// Adjust for difference between business_percentage and business_time_left calculations
					var calculatedTimeLeft = fullDurationInMillis - this._durationInMillis(taskSlaGr.getValue('business_duration'));
					timeLeftValue = Math.max(calculatedTimeLeft, this._durationInMillis(taskSlaGr.getValue('business_time_left')));

					var timeLeftDuration = new GlideDuration(timeLeftValue);
					timeLeftDisplayValue = timeLeftDuration.getDisplayValue();
				}

				slaTimerData[taskSlaSysId].time_left = {
					value: timeLeftValue,
					display_value: timeLeftDisplayValue
				};

				slaTimerData[taskSlaSysId].sla = {
					value: taskSlaGr.getValue('sla'),
					display_value: taskSlaGr.sla.getDisplayValue()
				};

				slaTimerData[taskSlaSysId].stage = {
					value: taskSlaGr.getValue('stage'),
					display_value: taskSlaGr.stage.getDisplayValue()
				};

				slaTimerData[taskSlaSysId].has_breached = {
					value: !!(parseInt(taskSlaGr.getValue('has_breached'))),
					display_value: taskSlaGr.has_breached.getDisplayValue()
				};

				if (slaTimerData[taskSlaSysId].has_breached.value)
					slaTimerData[taskSlaSysId].breach_time = {
						value: taskSlaGr.getValue('planned_end_time'),
						display_value: taskSlaGr.planned_end_time.getDisplayValue()
					};

				if (scheduleData)
					slaTimerData[taskSlaSysId].schedule = scheduleData;

				slaTimerData[taskSlaSysId].end_time = {
					value: taskSlaGr.getValue('end_time'),
					display_value: taskSlaGr.end_time.getDisplayValue()
				};
			}
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getTaskSlaData] slaTimerData: ' + JSON.stringify(slaTimerData));

		return slaTimerData;
	},

	// For a given task return the task_sla to breach first
	_getFirstToBreach: function(taskSysId, showCompleted, showCancelled) {
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getFirstToBreach] taskSysId: ' + taskSysId);

		if (!taskSysId)
			return '';

		var taskSlaGr = new GlideRecordSecure('task_sla');
		taskSlaGr.addQuery('task', taskSysId);
		taskSlaGr.orderBy('planned_end_time');
		// This ordering is added to remove arbitrary order returned from db
		taskSlaGr.orderBy('sys_id');

		var firstToBreachSysId = this._getTaskSla(taskSlaGr, showCompleted, showCancelled);

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getFirstToBreach] firstToBreachSysId: ' + firstToBreachSysId);

		return firstToBreachSysId;
	},

	_getMapping: function(configSysId, taskSysId, showCompleted, showCancelled) {
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getMapping] configSysId: ' + configSysId + ' taskSysId: ' + taskSysId);

		if (!configSysId || !taskSysId)
			return '';

		var taskSlaSysId = '';

		var configMapGr = new GlideRecord('sla_timer_config_mapping');
		configMapGr.addQuery('config', configSysId);
		configMapGr.addQuery('table', this._getTableName(taskSysId));
		configMapGr.addActiveQuery();
		configMapGr.orderBy('order');
		// This ordering is added to remove arbitrary order returned from db
		configMapGr.orderBy('sys_id');
		configMapGr.query();

		while (configMapGr.next()) {
			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug('[_getMapping] sla: ' + configMapGr.sla.getDisplayValue());

			var taskSlaGr = new GlideRecordSecure('task_sla');
			taskSlaGr.addQuery('task', taskSysId);
			taskSlaGr.addQuery('sla', configMapGr.sla);
			// This ordering is added to remove arbitrary order returned from db
			taskSlaGr.orderBy('sys_id');

			taskSlaSysId = this._getTaskSla(taskSlaGr, showCompleted, showCancelled);
			if (taskSlaSysId)
				break;
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getMapping] taskSlaSysId: ' + taskSlaSysId);

		return taskSlaSysId;
	},

	_getTaskSla: function(taskSlaGr, showCompleted, showCancelled) {

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getTaskSla] showCompleted: ' + showCompleted + ' showCancelled: ' + showCancelled);

		var stageComplete = this._getStageComplete();

		// Modify query based on should Completed and Cancelled Task SLAs be shown and run it
		this._modifyQueryForCompletedCancelled(taskSlaGr, showCompleted, showCancelled);

		var taskSlasByStage = {
			in_progress: null,
			paused: null,
			breached_in_progress: null,
			breached: null,
			breached_paused: null
		};

		if (showCompleted)
			taskSlasByStage.completed = null;

		if (showCancelled)
			taskSlasByStage.cancelled = null;

		taskSlaGr.query();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getTaskSla] encodedQuery: ' + taskSlaGr.getEncodedQuery());

		var taskSlaSysId = '';

		while (taskSlaGr.next()) {
			var stageValue = taskSlaGr.getValue('stage');
			taskSlaSysId = taskSlaGr.getUniqueValue();
			var isBreached = this._isBreached(taskSlaGr);

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug('[_getTaskSla] stageValue: ' + stageValue + ' isBreached: ' + isBreached);

			// in_progress and paused stages should return non-breached Task SLAs as they are more important
			if (!isBreached) {
				if (stageValue === 'in_progress' && !taskSlasByStage.in_progress) {
					taskSlasByStage.in_progress = taskSlaSysId;
					break;
				}

				if (stageValue === 'paused' && !taskSlasByStage.paused)
					taskSlasByStage.paused = taskSlaSysId;
			} else {
				// Breached Task SLAs should follow the same hierarchy of stages as non-breached
				if (stageValue === 'in_progress' && !taskSlasByStage.breached_in_progress)
					taskSlasByStage.breached_in_progress = taskSlaSysId;

				if (stageValue === 'breached' && !taskSlasByStage.breached)
					taskSlasByStage.breached = taskSlaSysId;

				if (stageValue === 'paused' && !taskSlasByStage.breached_paused)
					taskSlasByStage.breached_paused = taskSlaSysId;
			}

			// For Completed and Cancelled stages we do not care is Task SLA breached or not
			if (showCompleted && stageValue === stageComplete && !taskSlasByStage.completed)
				taskSlasByStage.completed = taskSlaSysId;

			if (showCancelled && stageValue === 'cancelled' && !taskSlasByStage.cancelled)
				taskSlasByStage.cancelled = taskSlaSysId;

			// Stop iterating through Task SLA records if each stage has been filled
			var unfilledStages = Object.keys(taskSlasByStage).filter(function(key) {
				return !taskSlasByStage[key];
			});

			if (unfilledStages.length === 0)
				break;
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getTaskSla] taskSlasByStage: ' + JSON.stringify(taskSlasByStage));

		taskSlaSysId = taskSlasByStage.in_progress || taskSlasByStage.paused || taskSlasByStage.breached_in_progress || taskSlasByStage.breached || taskSlasByStage.breached_paused || taskSlasByStage.completed || taskSlasByStage.cancelled || null;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getTaskSla] taskSlaSysId: ' + taskSlaSysId);

		return taskSlaSysId;
	},

	_modifyQueryForCompletedCancelled: function(taskSlaGr, showCompleted, showCancelled) {
		var excludedStages = [];
		var stageComplete = this._getStageComplete();

		if (!showCompleted)
			excludedStages.push(stageComplete);

		if (!showCancelled)
			excludedStages.push('cancelled');

		if (!stageComplete.length)
			taskSlaGr.addQuery('stage', 'NOT IN', excludedStages.join(','));
	},

	_isBreached: function(taskSlaGr) {
		return taskSlaGr.getValue('has_breached') === '1' || taskSlaGr.getValue('stage') === 'breached';
	},

	_getTableName: function(taskSysId) {
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getTableName] taskSysId: ' + taskSysId);

		if (!taskSysId)
			return '';

		var gr = new GlideRecord('task');
		if (!gr.get(taskSysId))
			return '';

		var tablename = gr.getValue('sys_class_name');

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getTableName] tablename: ' + tablename);

		return tablename;
	},

	_getStageComplete: function() {
		var stageComplete = !this._isTwentyElevenEngine || this._isBreachCompatibility ? 'achieved' : 'completed';

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getStageComplete] stageComplete: ' + stageComplete);

		return stageComplete;
	},

	_durationInMillis: function(durationValue) {
		var duration = new GlideDuration();
		duration.setValue(durationValue);

		var durationInMillis = duration.getNumericValue();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_durationInMillis] durationInMillis: ' + durationInMillis);

		return durationInMillis;
	},

	filters: {
		sysId: function(sysId) {
			return GlideStringUtil.isEligibleSysID(sysId);
		},

		unique: function(value, index, arr) {
			return arr.indexOf(value) === index;
		}
	},

	assign: function(target, varArgs) {
		if (target == null)
			throw new TypeError("Cannot convert undefined or null to object");

		var to = Object(target);

		for (var index = 1; index < arguments.length; index++) {
			var nextSource = arguments[index];

			if (nextSource != null) {
				for (var nextKey in nextSource) {
					if (Object.prototype.hasOwnProperty.call(nextSource, nextKey))
						to[nextKey] = nextSource[nextKey] + "";
				}
			}
		}
		return to;
	},

	type: 'SLATimerSNC'
};
```