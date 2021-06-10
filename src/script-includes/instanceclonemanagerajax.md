---
title: "InstanceCloneManagerAjax"
id: "instanceclonemanagerajax"
---

API Name: global.InstanceCloneManagerAjax

```js
var InstanceCloneManagerAjax = Class.create();

InstanceCloneManagerAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	canClone: function() {
		var instanceId = this.getParameter('sysparm_instance_id');
		
		var cloneAPI = new CloneAPI();
		if (cloneAPI.isCloneRunning()) {
			this.setError("An active clone is already running");
			return false;
		}
		
		if (!cloneAPI.isSameVersion(instanceId)) {
			this._addResponse('version_error', cloneAPI.getErrorMessage());
			this.setError(cloneAPI.getErrorMessage());
			return false;
		}
		
		return true;
	},

	// deprecated
	determineNodeOrder: function() {
		// deprecated
	},

	getCloneOptionsFromProfile: function() {
		var response = {};
		var cloneProfileSysId = this.getParameter('sysparm_cloneProfile');
		if(!gs.nil(cloneProfileSysId)) {
			var cloneProfileGr = new GlideRecord('clone_profile');
			if(cloneProfileGr.get(cloneProfileSysId)) {
				var preserve_in_progress_update_sets = cloneProfileGr.getValue('preserve_in_progress_update_sets');
				if(gs.nil(preserve_in_progress_update_sets)) {
					preserve_in_progress_update_sets = '';
				}
				
				response.target_instance = cloneProfileGr.getValue('target_instance');
				response.exclude_all_from_exclusion_list = cloneProfileGr.getValue('exclude_all_from_exclusion_list');
				response.exclude_large_data = cloneProfileGr.getValue('exclude_large_data');
				response.filter_attachment_data = cloneProfileGr.getValue('filter_attachment_data');
				response.amount_of_data_copied_from_large_tables = cloneProfileGr.getValue('amount_of_data_copied_from_large_tables');
				response.preserve_theme = cloneProfileGr.getValue('preserve_theme');
				response.preserve_users_and_related_tables = cloneProfileGr.getValue('preserve_users_and_related_tables');
				response.preserve_in_progress_update_sets = preserve_in_progress_update_sets;
			}
		}
		
		var json = new JSON();
		var encodedResponseString = json.encode(response);
		return encodedResponseString;
	},
	
	isDefaultProfileAllowed: function() {
		var cloneProfileGr = CloneProfileUtil.getDefaultProfile();
		var cloneProfileSysId = this.getParameter('sysparm_profile');
		
		if(gs.nil(cloneProfileGr) || cloneProfileSysId == cloneProfileGr.getValue('sys_id')) 
			return true;

		return false;
	},
	
	getDefaultCloneProfile: function() {
		var json = new JSON();
		var response = {};
		var cloneProfileGr = CloneProfileUtil.getDefaultProfile();
		if(!gs.nil(cloneProfileGr)) 
			response.profile = cloneProfileGr.getValue('sys_id');
		
		var encodedResponseString = json.encode(response);
		return encodedResponseString;
	},
	
	getRecurringCloneEndDate: function() {
		var cloneStartTime = this.getParameter('sysparm_cloneStartTime');
		var cloneFrequency = this.getParameter('sysparm_cloneFrequency');
		var occurrence = this.getParameter('sysparm_occurrence');
		var response = {};
		response.cloneEndTime = InstanceCloneUtil.getRecurringCloneEndDate(cloneStartTime, cloneFrequency, occurrence) + '';
		
		var json = new JSON();
		var encodedResponseString = json.encode(response);
		return encodedResponseString;
	},

	getCloneStatus: function() {
		var response = {};
		var cloneSysId = this.getParameter('sysparm_clone_id');
		new InstanceCloneScheduler().checkCloneStatus(cloneSysId);
	},

	getMinDate: function() {
		var response = {};
		var instanceId = this.getParameter('sysparm_instance_id');
		var tokenId = this.getParameter('sysparm_security_token');
		var profile = this.getParameter('sysparm_profile');
		var isAuthenticated = !gs.nil(tokenId);
		var scheduleDisplayValue = this.getParameter('sysparm_schedule_date');
		var scheduled = new GlideDateTime();
		if (!gs.nil(scheduleDisplayValue))
			scheduled.setDisplayValue(scheduleDisplayValue);

		var cloneRecord = new GlideRecord("clone_instance");
		cloneRecord.initialize();
		cloneRecord.setWorkflow(false); // don't run business rules, this is a temporary record
		cloneRecord.setValue("name", instanceId);
		cloneRecord.setValue("scheduled", scheduled);
		cloneRecord.setValue("state", "Draft");
		cloneRecord.setValue("target_instance", instanceId);
		cloneRecord.setValue("security_token", tokenId);
		cloneRecord.setValue("profile",profile);
		var sysId = cloneRecord.insert();
		//After this call scheduled will be updated from webservice response
		try {
			if (new InstanceCloneScheduler().notifyServer(cloneRecord)) {
				// if the user has successfully authenticated the target,
				// check if the server is not letting us proceed and possibly just error out.
				// This could happen if the server rejects certain client requests, war version mismatch, etc
				if (isAuthenticated && cloneRecord.state == 'Hold') {
					this.error = cloneRecord.message;
					this.setError(this.error);
					return;
				}

				// otherwise we're good to go
				//Changing the type of response object from string to object
				response.scheduledStartTime = cloneRecord.scheduled.getDisplayValue();
				// send as user time zone
				response.cloneEstimationMessage = cloneRecord.getValue('clone_estimation_message');
				response.minimumCloneStartTime = new GlideDateTime().getDisplayValue();//user time zone
			}
		} catch(e) {
			gs.log("Error checking clone schedule:" + e.toString());
			this.error = "Exception while checking clone schedule: " + e.toString();
			this.setError(this.error);
		} finally {
			response.cloneRecordSysId = sysId;
			this.addRecurringCloneParamsToResponse(cloneRecord, response);
		}
		var json = new JSON();
		var encodedResponseString = json.encode(response);
		return encodedResponseString;
	},

	addRecurringCloneParamsToResponse: function(cloneRecord, response) {
		var validationRules = cloneRecord.getValue('clone_request_validation_rules');
		if (!gs.nil(validationRules)) {
			validationRules = new JSON().decode(validationRules);
			var maxRecurringCloneDuration = validationRules.maxRecurringCloneDuration;
			response.maxRecurringCloneDuration = maxRecurringCloneDuration;
		}
		if(response.maxRecurringCloneDuration == undefined || gs.nil(response.maxRecurringCloneDuration)) 
			response.maxRecurringCloneDuration = CloneConstants.cloneOptions.DEFAULT_MAX_CLONE_DURATION;
	},

	startClone: function() {
		var instanceId = this.getParameter('sysparm_instance_id');
		var scheduled = "" + this.getParameter('sysparm_scheduled');
		var preserveTheme = this.getParameter('sysparm_preserve_theme');
		var excludeLargeData = this.getParameter('sysparm_exclude_large_data');
		var sourceInstance = this.getParameter('sysparm_source_instance');
		var clusterNode = this.getParameter('sysparm_cluster_node');
		var email = this.getParameter('sysparm_email');
		return this.scheduleClone(instanceId, scheduled, preserveTheme, excludeLargeData, sourceInstance, clusterNode, email);
	},

	scheduleClone: function(instanceId, scheduled, preserveTheme, excludeLargeData, sourceInstance, clusterNode, email) {
		if (gs.nil(instanceId)) {
			this.setError("Invalid instance");
			return false;
		}

		var igr = this.getInstanceRecord(instanceId);
		if (igr == null) {
			this.setError("Invalid instance record");
			return false;
		}

		var instanceName = igr.database_name;
		gs.log("InstanceClone: Scheduling instance clone to " + instanceName + " (" + instanceId + " on " + scheduled + ")");

		var newClone = new GlideRecord("clone_instance");
		newClone.setValue("name", instanceName);
		newClone.setValue("target_instance", instanceId);
		newClone.setValue("preserve_theme", preserveTheme);
		newClone.setValue("exclude_large_data", excludeLargeData);
		if (!gs.nil(sourceInstance))
			newClone.setValue("source_instance", sourceInstance);

		if (!gs.nil(clusterNode))
			newClone.setValue("cluster_node", clusterNode);

		newClone.setValue("email", email);
		newClone.setDisplayValue("scheduled", scheduled);
		newClone.setValue("state", "Requested");
		
		var newCloneId = newClone.insert();
		return newCloneId;
	},

	isReservationAvailable: function() {
		var response = {};
		var scheduleDisplayValue = this.getParameter('sysparm_clone_start_date');
		var cloneSysId = this.getParameter('sysparam_clone_record_sys_id');
		var scheduled = new GlideDateTime();
		if (!gs.nil(scheduleDisplayValue))
			scheduled.setDisplayValue(scheduleDisplayValue);

		var cloneRecord = new GlideRecord("clone_instance");
		if (cloneRecord.get(cloneSysId)) {
			var oldCloneStartTime = cloneRecord.getDisplayValue('scheduled');
			if (scheduled.getDisplayValue() != oldCloneStartTime) {
				cloneRecord.setValue("scheduled", scheduled);
				cloneRecord.update();
				try {
					//After this call scheduled will be updated from webservice response
					if (new InstanceCloneScheduler().notifySchedulingServerForCheckingReservation(cloneRecord)) {
						// if the user has successfully authenticated the target,
						// check if the server is not letting us proceed and possibly just error out.
						// This could happen if the server rejects certain client requests, war version mismatch, etc
						if (isAuthenticated && cloneRecord.state == 'Hold') {
							this.error = cloneRecord.message;
							this.setError(this.error);
							return;
						}
					} else {
						//cloneRecord.get(cloneSysId);
						response.scheduledStartTime = cloneRecord.scheduled.getDisplayValue();
						gs.log("After Update Message " + cloneRecord.getValue('clone_estimation_message'));
						gs.log("Is Reservation " + cloneRecord.getValue('is_reservation_available'));
						response.cloneEstimationMessage = cloneRecord.getValue('clone_estimation_message');
						response.isReservationAvailable = cloneRecord.getValue('is_reservation_available');
					}
				} catch(e) {
					gs.log("Error checking clone schedule:" + e.toString());
					this.error = "Exception while checking clone schedule: " + e.toString();
					this.setError(this.error);
				}
			}
		}

		var json = new JSON();
		var encodedResponseString = json.encode(response);
		return encodedResponseString;
	},

	getInstanceRecord: function(instanceId) {
		var gr = new GlideRecord('instance');
		if (gr.get(instanceId))
			return gr;

		return null;
	},
	
	cancelClone: function() {
		var table = this.getParameter("sysparm_table");
		var sysId = this.getParameter("sysparm_sys_id");

		if(gs.nil(table) || gs.nil(sysId)) 
			return false;

		var cancelReason = this.getParameter("sysparm_cancel_reason");
		if(cancelReason == "Other")
			cancelReason = this.getParameter("sysparm_cancel_other_reason");

		var cloneGr = new GlideRecord(table);
		if(cloneGr.get(sysId)) {
			var telemetry = cloneGr.getValue("telemetry");
			if(gs.nil(telemetry))
				telemetry = {};
			else {
					try {
						telemetry = JSON.parse(telemetry);
					} catch(e) {
						gs.logError("Error in Parsing telemetry value : " + e);
					}
				}

			telemetry["cancelReason"] = cancelReason;

			cloneGr.setValue("state", "Canceled");
			cloneGr.setValue("telemetry", JSON.stringify(telemetry));
			cloneGr.setValue("canceled", new GlideDateTime()); // GMT

			cloneGr.update();

			return true;
		}

		return false;
	},

	rollbackClone: function() {
var table = this.getParameter("sysparm_table");
		var sysId = this.getParameter("sysparm_sys_id");

		if(gs.nil(table) || gs.nil(sysId)) 
			return false;

		var rollbackReason = this.getParameter("sysparm_rollback_reason");
		if(rollbackReason == "Others")
			rollbackReason = this.getParameter("sysparm_other_reason");

		var cloneGr = new GlideRecord(table);
		if(cloneGr.get(sysId)) {
			var telemetry = cloneGr.getValue("telemetry");
			if(gs.nil(telemetry))
				telemetry = {};
			else {
				try {
					telemetry = JSON.parse(telemetry);
				} catch(e) {
					gs.logError("Error in Parsing telemetry value : " + e);
				}
			}

			telemetry["rollbackReason"] = rollbackReason;
			cloneGr.setValue("telemetry", JSON.stringify(telemetry));
			cloneGr.setValue("state", "Rollback Requested");
			cloneGr.update();
			return true;
		}

		return false;
	},

	_addResponse: function(name, node) {
		var item = this.newItem(name);
		var tn = this.getDocument().createTextNode(new JSON().encode(node));
		item.appendChild(tn);
	},
			
	isPublic: function() {
		return false;
	},

	logLargePreserverReason: function() {
		var table = this.getParameter("sysparm_table");
		var sysId = this.getParameter("sysparm_sys_id");
		if(gs.nil(table) || gs.nil(sysId)) 
			return false;
		var preserveReason = this.getParameter("sysparm_preserve_reason");
		if(preserveReason == "Others")
			preserveReason = this.getParameter("sysparm_preserve_other_reason");

		var cloneGr = new GlideRecord(table);
		if(cloneGr.get(sysId)) {
			var telemetry = cloneGr.getValue("telemetry");
			if(gs.nil(telemetry))
				telemetry = {};
			else {
				try {
					telemetry = JSON.parse(telemetry);
				} catch(e) {
					gs.logError("Error in Parsing telemetry value : " + e);
					gs.addInfoMessage("Error in Parsing telemetry value");
				}
			}
			telemetry["largePreserverReason"] = preserveReason;
			cloneGr.setValue("telemetry", JSON.stringify(telemetry));
			cloneGr.update();	
			return true;
		}
		return true;	
	},

			type: "InstanceCloneManagerAjax"
		});
```