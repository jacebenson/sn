---
title: "InstanceCloneScheduler"
id: "instanceclonescheduler"
---

API Name: global.InstanceCloneScheduler

```js
var InstanceCloneScheduler = Class.create();
InstanceCloneScheduler.prototype = {
	initialize: function() {
		this.clone_server_url = gs.getProperty("glide.db.clone.instance_clone_server");
		this.className = "InstanceCloneScheduler";
	},
	
	type: 'InstanceCloneScheduler',

	buildSOAPRequest: function(soapRequest, cloneGr, action)  {
		if(gs.nil(cloneGr) || gs.nil(action)) 
			return;

		if(gs.nil(soapRequest)) 
			soapRequest = new SOAPMessage('Instance Clone Schedule', 'execute');
		
		var endpoint = this.clone_server_url;
		var primaryIP = GlideUtil.isDeveloperInstance() ? "localhost" : GlideHostUtil.getPublicIPAddress();
		var standbyInstanceGr = this._getInstanceRecord(cloneGr.getValue('source_instance'));
		var targetInstanceGr = this._getInstanceRecord(cloneGr.getValue('target_instance'));

		var sourceName = SncCloneUtils.getSourceInstanceName();
		var sourceUrl = SncCloneUtils.getSourceInstanceUrl();

		soapRequest.setStringParameter('clone_id', cloneGr.getValue('sys_id'));

		if(action.equalsIgnoreCase("rollback")) {
			soapRequest.setStringParameter('request_for_rollback','true');
			soapRequest.setStringParameter('action',cloneGr.getValue('state'));
			soapRequest.setStringParameter('telemetry',cloneGr.getValue('telemetry'));
		} else if(action.equalsIgnoreCase("cancel")) {
			soapRequest.setStringParameter('action',cloneGr.getValue('state'));
			soapRequest.setStringParameter('telemetry',cloneGr.getValue('telemetry'));
		} else if(action.equalsIgnoreCase("getCloneStatus")) 
			soapRequest.setStringParameter('request_for_clone_status', 'true');
		else if(action.equalsIgnoreCase("schedule")) {
			soapRequest.setStringParameter('parent_clone_id', cloneGr.getValue('parent'));
			soapRequest.setStringParameter('date', cloneGr.getValue('scheduled') || new GlideDateTime());
			soapRequest.setStringParameter('state', cloneGr.getValue('state') || 'Draft');
			soapRequest.setStringParameter('cluster_node', this._getSystemId(cloneGr.getValue('cluster_node')));
			soapRequest.setStringParameter('user_name', cloneGr.getValue('sys_created_by'));
			soapRequest.setStringParameter('user_maint', this._isMaint(cloneGr.getValue('sys_created_by')));
			soapRequest.setStringParameter('user_email', cloneGr.getValue('email'));
			soapRequest.setStringParameter('security_token', cloneGr.getValue('security_token') || '');

			// instance details
			soapRequest.setStringParameter('source_instance_id', gs.getProperty('instance_id'));
			soapRequest.setStringParameter('source_instance_name', gs.getProperty('instance_name') || sourceName);
			soapRequest.setStringParameter('source_instance_url', sourceUrl);
			soapRequest.setStringParameter('target_instance_id', targetInstanceGr.instance_id);
			soapRequest.setStringParameter('target_instance_name', targetInstanceGr.instance_name);
			soapRequest.setStringParameter('target_instance_url', targetInstanceGr.instance_url);

			// version details
			soapRequest.setStringParameter('source_version', this._formatVersion(gs.getProperty('glide.war')));
			soapRequest.setStringParameter('target_version', this._formatVersion(targetInstanceGr.war_version));

			// jdbc details
			var primaryParms = GlideDBUtil.getPrimaryDBConfigurationParms();
			var sourceJDBCUrl = primaryParms.getURL().replace("localhost", primaryIP);
			var sourceDBName = primaryParms.getDatabaseName();

			var targetJDBCUrl = targetInstanceGr.database_url.replace("localhost", primaryIP);
			var targetDBName = targetInstanceGr.database_name;
			var standbyJDBCUrl = standbyInstanceGr == null ? "" : standbyInstanceGr.database_url.replace("localhost", primaryIP);
			var standbyDBName = standbyInstanceGr == null ? "" : standbyInstanceGr.database_name;

			soapRequest.setStringParameter('source_jdbc_url', sourceJDBCUrl);
			soapRequest.setStringParameter('source_db_server', this._formatDBServer(sourceJDBCUrl));
			soapRequest.setStringParameter('source_db_name', sourceDBName);
			soapRequest.setStringParameter('target_jdbc_url', targetJDBCUrl);
			soapRequest.setStringParameter('target_db_server', this._formatDBServer(targetJDBCUrl));
			soapRequest.setStringParameter('target_db_name', targetDBName);
			soapRequest.setStringParameter('standby_jdbc_url', standbyJDBCUrl);
			soapRequest.setStringParameter('standby_db_server', this._formatDBServer(standbyJDBCUrl));
			soapRequest.setStringParameter('standby_db_name', standbyDBName);
			soapRequest.setStringParameter('validation_error', targetInstanceGr.validation_error);

			// timing and metric details
			soapRequest.setStringParameter('mb_to_copy', cloneGr.getValue('megabytes_to_copy'));
			soapRequest.setStringParameter('mb_copied', cloneGr.getValue('.megabytes_copied'));
			soapRequest.setStringParameter('kb_per_second', cloneGr.getValue('kilobytes_per_second'));
			soapRequest.setStringParameter('duration', cloneGr.getValue('duration'));
			soapRequest.setStringParameter('started', cloneGr.getValue('started'));
			soapRequest.setStringParameter('completed', cloneGr.getValue('completed'));
			soapRequest.setStringParameter('cancelled', cloneGr.getValue('canceled')); 
			
			if(cloneGr.state != 'Draft'){
				var telemetry = this._getTelemetryData();
				soapRequest.setStringParameter('telemetry', telemetry);
			}
			//reservation details
			soapRequest.setStringParameter('check_for_available_reservation','false');
			
			// clone options
            soapRequest.setStringParameter('exclude_tables_specified_in_exclusion_list', cloneGr.getValue('exclude_all_from_exclusion_list'));
            soapRequest.setStringParameter('exclude_audit_and_log_data', cloneGr.getValue('exclude_large_data'));
            soapRequest.setStringParameter('exclude_large_attachment_data', cloneGr.getValue('filter_attachment_data'));
            soapRequest.setStringParameter('preserve_in_progress_update_sets', cloneGr.getValue('preserve_in_progress_update_sets'));
            soapRequest.setStringParameter('amount_of_data_copied_from_large_tables', cloneGr.getValue('amount_of_data_copied_from_large_tables'));
            soapRequest.setStringParameter('preserve_theme', cloneGr.getValue('preserve_theme'));
            soapRequest.setStringParameter('preserve_users_and_related_tables', cloneGr.getValue('preserve_users_and_related_tables'));
            soapRequest.setStringParameter('clone_frequency', cloneGr.getValue('clone_frequency'));
			
			soapRequest.setStringParameter('profile', cloneGr.getDisplayValue('profile'));
            soapRequest.setStringParameter('lock_clone_config', cloneGr.getValue('lock_profile_settings'));
		}

		if (endpoint)
			soapRequest.setSoapEndPoint(endpoint);

		// use custom authorization
		soapRequest.setRequestHeader("Authorization", "Clone " + gs.getProperty('instance_id') + ":" + primaryIP);
	},

	_checkForCloneStateChange: function(cloneRecord, doc) {
		var state = this._getText(doc, 'state') + '';
		var description = this._getText(doc, 'description') + '';

		var oldState = cloneRecord.state;
		var stateChanged = !gs.nil(state) && oldState != state;

		if ( stateChanged ) {
			gs.log("Schedule Server changed state from " + oldState + " to " + state + " (" + description + ")", this.className);
			cloneRecord.state = state;
			if (state == 'Hold')
				cloneRecord.message = description;
		}
	},

	_checkForCloneScheduleChange: function(cloneGr, doc) {

		var cloneValidationRules = this._getText(doc,'clone_request_validation_rules')+'';
		cloneGr.setValue('clone_request_validation_rules', cloneValidationRules);
		var scheduled = cloneGr.scheduled;
		if (!gs.nil(this._getText(doc, 'date')))
			scheduled = new GlideDateTime(this._getText(doc, 'date')); // GMT

		var dateChanged = cloneGr.scheduled.getDisplayValue() != scheduled.getDisplayValue();

		if ( dateChanged ) {
			var cloneEstimationMessage = this._getText(doc,'clone_estimation_message')+'';
			var isReservationAvailableForCloning = this._getText(doc,'is_reservation_available')+'';

			cloneGr.setValue("scheduled", scheduled); // GMT
			cloneGr.setValue("clone_estimation_message", cloneEstimationMessage);
			cloneGr.setValue("is_reservation_available", isReservationAvailableForCloning);
		}

	},

	_updateCloneRespParams: function(cloneRecord, doc) {

		var description = this._getText(doc, 'description')+'';

		var standbyInstanceGr = this._getInstanceRecord(cloneRecord.source_instance);
		var standbyDBName = standbyInstanceGr == null ? "" : standbyInstanceGr.database_name;
		var standbyJDBCUrl = standbyInstanceGr == null ? "" : standbyInstanceGr.database_url.replace("localhost", primaryIP);

		var cloneType = this._getText(doc, 'clone_type')+'';

		var newStandbyJDBCUrl = this._getText(doc, 'standby_jdbc_url')+'';
		var newStandbyDBName = this._getText(doc, 'standby_db_name')+'';
		var newClusterNode = this._getText(doc, 'cluster_node')+'';

		var isCloneTypeChanged = !gs.nil(cloneType) && cloneRecord.clone_type != cloneType;
		var standbyChanged = !gs.nil(newStandbyJDBCUrl) && (gs.nil(standbyJDBCUrl) || standbyJDBCUrl != newStandbyJDBCUrl);
		var nodeChanged = !gs.nil(newClusterNode) && (gs.nil(cloneRecord.cluster_node) || cloneRecord.cluster_node != newClusterNode);
		
		var oldScheduled = cloneRecord.scheduled;
		var oldClusterNode = cloneRecord.cluster_node||'';
		
		if ( nodeChanged && this._setClusterNode(cloneRecord, newClusterNode) ) 
			gs.log("Schedule Server changed cluster node from " + oldClusterNode + " to " + newClusterNode + " (" + description + ")", this.className);
		
		if ( standbyChanged && this._setStandbySource(cloneRecord, newStandbyJDBCUrl, newStandbyDBName) ) 
			gs.log("Schedule Server changed standby db from " + standbyJDBCUrl + "." + standbyDBName + " to " + newStandbyJDBCUrl + "." + newStandbyDBName + 
				   " (" + description + ")", this.className);

		if ( isCloneTypeChanged ) {
			gs.log("Clone Type changed from " + cloneRecord.clone_type + " to " + cloneType, this.className);
			cloneRecord.setValue("clone_type", cloneType);
		}

	},

	handleSOAPResponse: function(response, cloneGr) {
		try {
			var doc = new GlideXMLDocument();
			doc.parse(response);
			
			gs.log(cloneGr.getValue('clone_id') + " : Schedule Clone Response from server " + doc, this.className);

			this._checkForCloneScheduleChange(cloneGr, doc);
			this._checkForCloneStateChange(cloneGr, doc);
			this._updateCloneRespParams(cloneGr, doc);

			var cloudDetails = this._getText(doc,'cloud_details')+'';
			if(!gs.nil(cloudDetails)) 
				cloneGr.setValue("cloud_details", cloudDetails);

			cloneGr.setWorkflow(false);
			cloneGr.update();
		} catch (e) {
			throw e;
		}
	},
	
	/** Notify instance clone schedule server by calling web service - response might cause the record to be updated */
	notifyServer: function(cloneGr) {
		var notified = false;
		
		var targetInstanceGr = this._getInstanceRecord(cloneGr.target_instance);
		var sourceName = SncCloneUtils.getSourceInstanceName();
		
		// developer installs and localhost: source/target should not contact production url clone.service-now.com
		if (this._shouldSkip(sourceName, targetInstanceGr.instance_name))
			return notified;
		
		try {
			var soapRequest = new SOAPMessage('Instance Clone Schedule', 'execute');
			
			this.buildSOAPRequest(soapRequest, cloneGr, 'schedule');

			var response = soapRequest.post();
			if (soapRequest.httpStatus != 200) 
				this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.server.confirmation', '');
			else {
				this.handleSOAPResponse(response, cloneGr);
				notified = true;
				if(cloneGr.getValue("state") == CloneConstants.status.CLONE_STATUS_REQUESTED) 
					this.logCloneMessage(cloneGr, /*info*/0, 'clone.log.info.schedule.success', cloneGr.getValue('clone_id'));
			}
		} catch (e) {
			this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.schedule.request', e.toString());
		}

		return notified;
	},

	logCloneMessage: function(cloneGr, logLevel, msgKey, msgArgs) {
		var argsArray = [];

		if(gs.nil(cloneGr)) 
			return;

		if(!gs.nil(msgArgs)) 
			argsArray.push(msgArgs);

		if(!gs.nil(msgKey)) 
			SncCloneLogger.log(this.className, cloneGr.getValue('sys_id'), null, logLevel, gs.getMessage(msgKey, argsArray));
	},

	// Piggy Back the same service Call with additional paramter for checking Reservation

	notifySchedulingServerForCheckingReservation: function(cloneGr) {

		var soapRequest = new SOAPMessage('Instance Clone Schedule', 'execute');
		soapRequest.setStringParameter('clone_id', cloneGr.getValue('sys_id'));
		soapRequest.setStringParameter('date', cloneGr.scheduled || new GlideDateTime());
		soapRequest.setStringParameter('check_for_available_reservation','true');
		var endpoint = this.clone_server_url;
		gs.log("Calling instance clone scheduler server: " + endpoint, this.className);
		var primaryIP = GlideUtil.isDeveloperInstance() ? "localhost" :
		GlideHostUtil.getPublicIPAddress();
		if (endpoint)
			soapRequest.setSoapEndPoint(endpoint);
		// use custom authorization
		soapRequest.setRequestHeader("Authorization", "Clone " + 
						gs.getProperty('instance_id') + ":" + primaryIP);
		var response = soapRequest.post();
		if (soapRequest.httpStatus != 200)
			this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.server.confirmation', '');
		else {
			var doc = new GlideXMLDocument();
			doc.parse(response);
			var isReservationAvailableForCloning = this._getText(doc,'is_reservation_available');
			var scheduled = new GlideDateTime(this._getText(doc, 'date')); // GMT
			var cloneEstimationMessage = this._getText(doc,'clone_estimation_message');
			cloneGr.setValue("scheduled", scheduled); // GMT
			cloneGr.setValue("clone_estimation_message",cloneEstimationMessage);
			cloneGr.setValue("is_reservation_available", isReservationAvailableForCloning);
			cloneGr.setWorkflow(false); //Don't trigger any BR
			cloneGr.update();
			
		}
		
	},
	notifySchedulingServerForCancel: function(cloneGr) {
		var schedule = new ScheduleOnce();
		schedule.setLabel("Schedule Clone Cancel for " + cloneGr.getValue('clone_id'));
		schedule.script = "new InstanceCloneScheduler()._notifyCloneServerForCancelByCloneId('" + cloneGr.getValue('sys_id') + "');";
		return schedule.schedule();
	},

	/** Notify Clone Server for Clone Rollback in case of Backup Based Clones */
	notifySchedulingServerForRollback: function(cloneGr){
		var schedule = new ScheduleOnce();
		schedule.setLabel("Schedule Clone Rollback for " + cloneGr.getValue('clone_id'));
		schedule.script = "new InstanceCloneScheduler()._notifyCloneServerForRollbackByCloneId('" + cloneGr.getValue('sys_id') + "');";
		return schedule.schedule();
	},

	/** Notify instance clone schedule server by calling web service - response might cause the record to be updated */
	scheduleNotifyServer: function(cloneRecord) {
		var schedule = new ScheduleOnce();
		schedule.setLabel("Notify instance clone scheduler");
		schedule.script = "new InstanceCloneScheduler()._notifyServerByCloneId('" +
			cloneRecord.sys_id + "');";
		return schedule.schedule();
	},

	/** Notify instance clone schedule server by calling web service - response might cause the record to be updated */
	_notifyServerByCloneId: function(cloneId) {
		var cloneRecord = new GlideRecord("clone_instance");
		if (cloneRecord.get(cloneId))
			this.notifyServer(cloneRecord);

	},
	
	checkCloneStatus: function(cloneSysId) {
		var cloneGr = new GlideRecord("clone_instance");
		if (!cloneGr.get(cloneSysId)) 
			return;

		var cloneState = cloneGr.getValue('state');
		if(!cloneState.equalsIgnoreCase('Requested')) 
			return;

		var cloneId = cloneGr.getValue('clone_id');
		try {
			var soapRequest = new SOAPMessage('Instance Clone Schedule', 'execute');
			this.buildSOAPRequest(soapRequest, cloneGr, 'getCloneStatus');
			var response = soapRequest.post();
			if (soapRequest.httpStatus != 200) {
				this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.status.confirmation', '');
				gs.logError(cloneId + ": Error in getting status from server : " + response, this.className);
				cloneGr.setValue('state', 'Error');
			} else {
				var doc = new GlideXMLDocument();
				doc.parse(response);
				gs.log(cloneId + ": Check Clone Status Response: " + doc, this.className);
				cloneState = this._getText(doc, 'state');
				if(!gs.nil(cloneState))
					cloneGr.setValue('state', cloneState);

				this.logCloneMessage(cloneGr, /*info*/0, this._getText(doc, 'description'), '');
			}
		} catch (e) {
			this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.status.confirmation', '');
			gs.logError(cloneId + ": Error in getting status from server : " + e.toString(), this.className);
			cloneGr.setValue('state', 'Error');
		}
		cloneGr.setWorkflow(false);
		cloneGr.update();
	},

	_notifyCloneServerForCancelByCloneId: function(cloneSysId) {
		var cloneGr = new GlideRecord("clone_instance");
		if (!cloneGr.get(cloneSysId)) 
			return;

		var cloneId = cloneGr.getValue('clone_id');
		var soapRequest = new SOAPMessage('Instance Clone Schedule', 'execute');

		this.buildSOAPRequest(soapRequest, cloneGr, 'cancel');

		var response = soapRequest.post();
		if (soapRequest.httpStatus != 200){
			this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.server.confirmation', '');
			gs.logError(cloneId + " : Error in Response from server : " + response, this.className);
		} else {
			var doc = new GlideXMLDocument();
			doc.parse(response);

			gs.log(cloneId + " : Cancel Clone Response from server " + doc, this.className);
			SncCloneLogger.log(this.className, cloneGr.getValue('sys_id'), null, /*info*/0, this._getText(doc, 'description'));
		}
	},

	_notifyCloneServerForRollbackByCloneId: function(cloneSysId) {
		var cloneGr = new GlideRecord("clone_instance");
		if (!cloneGr.get(cloneSysId)) 
			return;

		var cloneId = cloneGr.getValue('clone_id');
		var soapRequest = new SOAPMessage('Instance Clone Schedule', 'execute');

		this.buildSOAPRequest(soapRequest, cloneGr, 'rollback');

		var response = soapRequest.post();
		if (soapRequest.httpStatus != 200){
			this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.server.confirmation', '');
			gs.logError(cloneId + " : Error in Response from server : " + response, this.className);
		} else {
			var doc = new GlideXMLDocument();
			doc.parse(response);

			var state = this._getText(doc, 'state')+'';
			cloneGr.setValue('state', state);
			cloneGr.setWorkflow(false);//Don't trigger any BR
			cloneGr.update();

			gs.log(cloneId + " : Rollback Clone Response from server " + doc, this.className);
			SncCloneLogger.log("InstanceCancelClone", cloneGr.getValue('sys_id'), null, /*info*/0, this._getText(doc, 'description'));
		}
	},

	_isMaint: function(user_id) {
		if (gs.hasRole('maint'))
			return true;

		var gr = new GlideRecord("sys_user");
		gr.addQuery("user_name", user_id);
		gr.query();
		if (gr.next()) {
			var user = GlideUser.getUserByID(gr.sys_id);
			return user != null ? user.hasRole("maint") : false;
		}
		return false;
	},

	_formatVersion: function(version) {
		if (gs.nil(version))
			return "";

		if (version == 'null')
			return "";

		if (version.length > 4 && version.indexOf('.') > -1)
			return version.substring(0, version.length-4);

		return version;
	},

	_formatDBServer: function(jdbcUrl) {
		if (gs.nil(jdbcUrl))
			return "";

		// jdbc:mysql://servername:port/
		// jdbc:sqlserver://servername:portnum/
		var answer = jdbcUrl;
		var idx = answer.indexOf('://');
		if (idx > -1) {
			answer = answer.substring(idx+3).replace('/', '');
			idx = answer.indexOf(':');
			if (idx > -1)
				answer = answer.substring(0, idx);
		}

		// jdbc:oracle:thin:@host.com:1521:sidname
		idx = jdbcUrl.indexOf(':@');
		if (idx > -1) {
			answer = answer.substring(idx+2).replace('/', '');

			idx = answer.indexOf(':');
			if (idx > -1)
				answer = answer.substring(0, idx);
		}

		return answer;
	},

	_getText: function(doc, tag) {
		var el = doc.getElementByTagName(tag);
		if (el && el != null)
			return el.getTextContent();

		return "";
	},

	_getSystemId: function(clusterStateSysId) {
		if (gs.nil(clusterStateSysId))
			return "";

		var gr = new GlideRecord("sys_cluster_state");
		if (gr.get(clusterStateSysId))
			return gr.system_id;

		return "";
	},

	_setClusterNode: function(cloneRecord, clusterNode) {
		if (gs.nil(clusterNode))
			return false;

		var gr = new GlideRecord("sys_cluster_state");
		gr.addQuery("status", "online"); // only allow change to online nodes
		// we can receive cluster node input in three variations
		var qc = gr.addQuery("sys_id", clusterNode);
		qc.addOrCondition("node_id", clusterNode);
		qc.addOrCondition("system_id", clusterNode);
		gr.query();
		if ( gr.next() && (gs.nil(cloneRecord.cluster_node) || 
						cloneRecord.cluster_node != gr.sys_id) ) {
			cloneRecord.cluster_node = gr.sys_id;
			return true;
		}
		
		return false;
	},

	_getInstanceRecord: function(instanceSysId) {
		if (gs.nil(instanceSysId))
			return null;

		var gr = new GlideRecord('instance');
		if (gr.get(instanceSysId) && gr.primary == false) // don't return the primary setup record
			return gr;

		return null;
	},

	_setStandbySource: function(cloneRecord, jdbcUrl, dbName) {
		if (gs.nil(jdbcUrl) || gs.nil(dbName))
			return false;

		// First validate db connection
		var primaryParms = GlideDBUtil.getPrimaryDBConfigurationParms();
		var user = primaryParms.getUser();
		var clearPassword = primaryParms.getPassword();
		var encryptedPassword = this._encrypt(clearPassword);
		var rdbms = primaryParms.getRDBMS();
		var tablespace = null;
		try {
			var instance = new SncCloneInstance(dbName, user, encryptedPassword,
												jdbcUrl, rdbms, tablespace);
			// verify that the database exists
			if (!instance.instanceDatabaseExists()) {
				SncCloneLogger.log("InstanceClone", cloneRecord.sys_id,
								   null,
								   /*error*/2,
								   "Source cannot be cloned from: database does not "+
								   "exist");
				return false;
			}

			// verify that the alternative source can be cloned from
			if (!instance.canCloneFrom()) {
				SncCloneLogger.log("InstanceClone", 
								   cloneRecord.sys_id, null, 
								   /*error*/2, 
								   "Source cannot be cloned from: instance_id "+
								   "does not match primary database "+
								   "(it appears to be a different database)");
				return false;
			}
		} catch(e) {
			SncCloneLogger.log("InstanceClone", 
							   cloneRecord.sys_id, 
							   null, 
							   /*error*/2, 
							   "Source cannot be cloned from: unable "+
							   "to connect to database and verify instance_id: "+
							   e.toString());
			return false;
		}

		var isNew = false;
		var gr = new GlideRecord("instance");
		gr.addQuery("source", true);
		gr.addQuery("primary", false);
		gr.query();
		if (!gr.next()) {
			isNew = true;
			gr.initialize();
			gr.setValue("source", true);
			gr.setValue("primary", false);
		}

		gr.database_url = jdbcUrl;
		gr.database_name = dbName;
		gr.database_tablespace = tablespace;
		gr.database_type = rdbms;
		gr.database_user = user;
		gr.database_password = encryptedPassword;

		gr.instance_id = gs.getProperty("instance_id")+"";
		if (gs.nil(gr.instance_name))
			gr.instance_name = "Standby Database";
		if (gs.nil(gr.instance_url))
			gr.instance_url = gs.getProperty("glide.servlet.uri")+"";
		gr.production = gs.getProperty("glide.installation.production");
		gr.war_version = gs.getProperty("glide.war")+"";

		if (isNew)
			gr.insert();
		else
			gr.update();

		cloneRecord.source_instance = gr.sys_id;
		return true;
	},

	/* developer installs and localhost: source/target should not contact production url clone.service-now.com */
	_shouldSkip: function(sourceName, targetName) {
		var answer = false;
		var url = this.clone_server_url; // eg https://clone.service-now.com/InstanceCloneSchedule.do?SOAP
		if (gs.nil(url))
			return answer;

		var productionUrl = "https://clone.service-now.com/";
		var isDeveloper = GlideUtil.isDeveloperInstance() &&
			!GlideUtil.isProductionInstance();
		var isLocalHost = sourceName.indexOf("localhost") > -1 ||
			targetName.indexOf("localhost") > -1;
		// if we're trying to contact the production url and we're a local installation, do not pass go
		if (url.indexOf(productionUrl) > -1 && (isDeveloper || isLocalHost)) {
			answer = true;
			gs.print("InstanceCloneScheduler - this is a developer "+
					 "or localhost instance, production scheduling service is not "+
					 "supported: to resolve, change property "+
					 "glide.db.clone_server_url");
		}

		return answer;
	},
	
	_getTelemetryData: function(){
		var gr = new GlideRecord("clone_instance");
		gr.orderByDesc('sys_created_on');
		//Each clone request sends three SOAP requests with states - Draft,Draft,Requested
		gr.setLimit(3);
		gr.query();
		var telemetry = {};
		while (gr.next()) {
			// security_token value is null for first Draft request in which we store the telemetry data
			if (!gr.getValue('security_token')) {
				telemetry = gr.getValue('telemetry');
			}
		}
		return telemetry;
	},

	_encrypt: function(unencryptedString) {
		if (gs.nil(unencryptedString))
			return "";

		var encryptor =  new GlideEncrypter();
		return encryptor.encrypt(unencryptedString);
	}
};
```