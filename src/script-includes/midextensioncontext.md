---
title: "MIDExtensionContext"
id: "midextensioncontext"
---

API Name: global.MIDExtensionContext

```js
var MIDExtensionContext = Class.create();

// For some reason I'm unable to call "typeof current" to see if it's defined.
// This hack works around that problem.
function globalDefined(name) { return name in this; }

(function() {

var _this,
	VCENTER_COLLECTOR = 'ecc_agent_ext_context_vcenter';

MIDExtensionContext.prototype = {
	CLUSTER_MEMBER_M2M: 'ecc_agent_cluster_member_m2m',
	CLUSTER_TABLE: 'ecc_agent_cluster',
	ECC_AGENT_CAPABILITY_M2M: 'ecc_agent_capability_m2m',
	AGENT_TABLE: 'ecc_agent',
	ECC_QUEUE_TABLE: 'ecc_queue',
	LOAD_BALANCE: 'Load Balance',
	FAILOVER: 'Failover',
	type: 'MIDExtensionContext',

	initialize: function(gr, formData, capabilities) {
		_this = this;

		// Get the real record of extended tables. This is necessary because
		// the script can be invoked on records on the base context table (such
		// as by the business rule "Failover MID Server Extension").
		var gru = GlideScriptRecordUtil.get(gr);
		var realGr = gru.getRealRecord();
		this.contextGr = realGr;

		// There are quite a few places that we create MIDExtensionContexts and we need to
		// do it differently for vCenter. I see 4 options:
		// 1. Modify all of them to pass the correct capabilities (possibly by making this check)
		// 2. Duplicate everything on the ecc_agent_ext_context_vcenter table - have new UI actions
		//    for start, stop, restart, etc.
		// 3. Make the check here.
		// I'm choosing option 4: Allow options 1 or 2 while also making the check here.  New
		// code can do things correctly but existing code continues to work.
		if (!capabilities && (this.contextGr.sys_class_name == VCENTER_COLLECTOR))
			capabilities = [ { capability: 'VMware' } ];
		this.capabilities = capabilities;

		if (JSUtil.notNil(formData))
			for (var key in formData)
				realGr.setValue(key, this.decodeHTML(formData[key]));

		// Add known parameters from the base table.
		this.payloadDoc = new GlideXMLDocument(MIDExtensionConstants.PARAMETERS);
		this.addParameter(MIDExtensionConstants.PARAMETER_CONTEXT_SYS_ID, realGr.sys_id);
		this.addParameter(MIDExtensionConstants.PARAMETER_CONTEXT_NAME, realGr.name);
		this.addParameter(MIDExtensionConstants.PARAMETER_EXTENSION_NAME, realGr.extension.name);
		this.addParameter(MIDExtensionConstants.PARAMETER_EXTENSION_CLASS_NAME, realGr.extension.class_name);
		
		// Add all fields from extended tables as context data.
		var contextData = {};
		var fields = realGr.getFields();
		for (index = 0; index < fields.size(); index++) {
			var elem = fields.get(index);
			// skip if field is from the base table
			var descriptor = elem.getED();
			if (descriptor.getTableName() == MIDExtensionConstants.CONTEXT_TABLE)
				continue;

			// skip if nil value
			var name = elem.getName() + '';
			var value = elem.getElementValue(name);
			if (JSUtil.nil(value))
				continue;

			if (descriptor.isReference())
				contextData[name] = MIDExtensionRelatedListUtil.getReferenceData(descriptor, value);
			else
				contextData[name] = value + '';
		}

		// Add all related lists data.
		MIDExtensionRelatedListUtil.getAllRelatedData(realGr, contextData);

		// Add parameter as JSON string.
		this.addParameter(MIDExtensionConstants.PARAMETER_CONTEXT_DATA, JSON.stringify(contextData));
	},

	decodeHTML: function(htmlEncoded) {
		return htmlEncoded.replace(/&apos;/g, "'")
							.replace(/&quot;/g, '"')
							.replace(/&gt;/g, '>')
							.replace(/&lt;/g, '<')
							.replace(/&amp;/g, '&');
	},

	addParameter: function(name, value) {
		var el = this.payloadDoc.createElement(MIDExtensionConstants.PARAMETER);
		el.setAttribute(MIDExtensionConstants.PARAMETER_NAME, name);
		el.setAttribute(MIDExtensionConstants.PARAMETER_VALUE, value);
	},

	start: function() {
		this.sendCommand(MIDExtensionConstants.COMMAND_START);
	},

	stop: function() {
		this.sendCommand(MIDExtensionConstants.COMMAND_STOP);
	},

	restart: function() {
		this.sendCommand(MIDExtensionConstants.COMMAND_RESTART);
	},

	reselect: function() {
		this.sendCommand(MIDExtensionConstants.COMMAND_RESELECT);
	},

	testParameters: function() {
		return this.sendCommand(MIDExtensionConstants.COMMAND_TEST_PARAMETERS);
	},

	updateParameters: function() {
		this.sendCommand(MIDExtensionConstants.COMMAND_UPDATE_PARAMETERS);
	},

	isValidMid: isMidValidAndUp,

	sendCommand: function(command, skipUpdate) {
		var agentSysId;
		var agentGr;

		if (globalDefined('action'))
			action.setRedirectURL(current);

		switch (command) {
			case MIDExtensionConstants.COMMAND_START:
				// if already started and mid server is up then don't do anything
				if (this.isExecuting() && JSUtil.notNil(this.getCurrentMidserver()))
					return null;

				// if no MID server can be selected, mark it offline
				agentSysId = this.selectMidServer();
				if (JSUtil.nil(agentSysId)) {
					gs.addErrorMessage(gs.getMessage('MID server not available. See Error Message for details.'));
					this.contextGr.status = MIDExtensionConstants.CONTEXT_STATUS_OFFLINE;
					if (JSUtil.nil(this.contextGr.error_message))
						this.contextGr.error_message = 'MID Server down or not validated';
					this.contextGr.update();
					return null;
				}

				// got a MID server to start it on
				this.contextGr.status = MIDExtensionConstants.CONTEXT_STATUS_STARTING;
				this.contextGr.executing_on = agentSysId;
				this.contextGr.error_message = '';
				break;
			case MIDExtensionConstants.COMMAND_STOP:
				// if already stopped then don't do anything
				if (this.contextGr.status == MIDExtensionConstants.CONTEXT_STATUS_STOPPED)
					return null;

				agentSysId = this.contextGr.executing_on;

				// if offline, go ahead and update to stopped
				if (!this.isValidMid(agentSysId) || (this.contextGr.status == MIDExtensionConstants.CONTEXT_STATUS_OFFLINE)) {
					gs.addErrorMessage(gs.getMessage('MID server must be up and validated'));
					this.contextGr.status = MIDExtensionConstants.CONTEXT_STATUS_STOPPED;
					this.contextGr.update();
					return null;
				}

				this.contextGr.status = MIDExtensionConstants.CONTEXT_STATUS_STOPPING;
				break;
			case MIDExtensionConstants.COMMAND_RESELECT:
				var agents = getAcceptableMids(this.contextGr, this.capabilities);
				if (agents.includes('' + this.contextGr.executing_on))
					return;

				// The current MID server isn't acceptable.  Restart and we (might) get
				// an acceptable MID.
				// Make sure to stop it on its current MID.  We're stopping it for reselect, so
				// we need to make sure it goes to 'offline' instead of 'stopped'
				this.addParameter(MIDExtensionConstants.PARAMETER_COMMAND_REASON, MIDExtensionConstants.COMMAND_RESELECT);
				this.sendCommand(MIDExtensionConstants.COMMAND_STOP, true);

				var context = new MIDExtensionContext(this.contextGr, null, this.capabilities);
				context.start();
				return;
			case MIDExtensionConstants.COMMAND_RESTART:
				// use current assigned MID server if it's up
				// select new one if not assigned or down
				agentSysId = this.selectMidServer();

				// if no MID server can be selected, mark it offline
				if (JSUtil.nil(agentSysId)) {
					gs.addErrorMessage(gs.getMessage('MID server not available for event collector. See Error Message for details.'));
					this.contextGr.status = MIDExtensionConstants.CONTEXT_STATUS_OFFLINE;
					if (JSUtil.nil(this.contextGr.error_message))
						this.contextGr.error_message = 'MID Server down or not validated';
					this.contextGr.update();
					return null;
				}

				// attempt to restart
				this.contextGr.status = MIDExtensionConstants.CONTEXT_STATUS_RESTARTING;
				this.contextGr.error_message = '';
				break;
			case MIDExtensionConstants.COMMAND_TEST_PARAMETERS:
				// use current assigned MID server if it's up
				// select new one if not assigned or down
				agentSysId = this.selectMidServer();
				skipUpdate = true;
				if (JSUtil.nil(agentSysId)) {
					gs.addErrorMessage(gs.getMessage('MID server not available'));
					return null;
				}
				break;
			case MIDExtensionConstants.COMMAND_UPDATE_PARAMETERS:
				// if not already started then don't do anything
				if (!this.isExecuting())
					return null;

				agentSysId = this.contextGr.executing_on;
				if (!this.isValidMid(agentSysId) || (this.contextGr.status == MIDExtensionConstants.CONTEXT_STATUS_OFFLINE)) {
					gs.addErrorMessage(gs.getMessage('MID server must be up and validated'));
					this.contextGr.status = MIDExtensionConstants.CONTEXT_STATUS_STOPPED;
					this.contextGr.update();
					return null;
				}
				break;
		}
		// only update context record if command is not test parameters;
		// this is important because we send dirty data from the form that
		// we don't want to save
		skipUpdate || this.contextGr.update();

		agentGr = new GlideRecord(this.AGENT_TABLE);
		agentGr.get(agentSysId);

		this.addParameter(MIDExtensionConstants.PARAMETER_EXTENSION_COMMAND, command);

		var classNameTokens = this.contextGr.extension.class_name.split('.');
		var className = classNameTokens[classNameTokens.length - 1];
		var gr = new GlideRecord(this.ECC_QUEUE_TABLE);
		gr.payload = this.payloadDoc.toString();
		gr.agent = 'mid.server.' + agentGr.name;
		gr.topic = 'MIDExtension' + ':' + className;
		gr.name = this.contextGr.extension.name + ':' + this.contextGr.name + '(' + this.contextGr.sys_id + ')';
		gr.state = 'ready';
		gr.queue = 'output';
		var ecc_queue_id = gr.insert();
		return ecc_queue_id;
	},

	isExecuting: function() {
		return this.contextGr.status == MIDExtensionConstants.CONTEXT_STATUS_STARTED ||
				this.contextGr.status == MIDExtensionConstants.CONTEXT_STATUS_WARNING;
	},

	getCurrentMidserver: function() {
		// return the current assigned MID server if it's up or degraded
		var agentSysId = this.contextGr.executing_on;
		if (this.isValidMid(agentSysId))
			return agentSysId ;
		return null;
	},

	// Keeping reselect for backward compability
	reselectMidServer: function() { return this.selectMidServer; },

	selectMidServer: function() {
		var preferred = '' + this.getCurrentMidserver(),
			contextGr = this.contextGr,
			agents = getAcceptableMids(contextGr, this.capabilities);

		// if no MID server is available, return null and the context
		// will be marked offline
		if (agents.length == 0) {
			contextGr.error_message = contextGr.error_message || 'No MID Server available';
			return null;
		}

		contextGr.error_message = '';

		if (agents.incudes(preferred))
			return preferred;

		// randomly pick one from the list
		var pick = Math.floor(Math.random() * agents.length);
		return agents[pick];
	}
};

function getAcceptableMids(contextGr, capabilities) {
	var agents = [];
	contextGr.error_message = '';
	if (contextGr.execute_on == MIDExtensionConstants.CHOICE_MID_SERVER) {
		if (isMidValidAndUp(contextGr.mid_server)) {
			if (contextGr.sys_class_name == VCENTER_COLLECTOR) {
				var vCenterEventCollectorMid = new GlideRecord(VCENTER_COLLECTOR);
				vCenterEventCollectorMid.addQuery('status', 'IN', 'Starting,Started,Restarting');
				vCenterEventCollectorMid.addQuery('vcenter', contextGr.vcenter);
				vCenterEventCollectorMid.query();
				if (vCenterEventCollectorMid.next()) {
					contextGr.error_message = 'Event collector for '+contextGr.vcenter.name+' is already started on  mid server '+vCenterEventCollectorMid.mid_server.name;
					return agents;
				}
			}
			agents.push(contextGr.mid_server);
		}
	} else if (contextGr.execute_on + '' == MIDExtensionConstants.CHOICE_AUTOSELECT_MID) {

		// Are we autoselecting a MID?
		try {
			var sel = new SNC.MidSelector();
			agents = sel.select(null, [ contextGr.vcenter.ip_address + '' ], capabilities);
		} catch (e) {
			contextGr.error_message = e.toString();
		}
	} else {
		// if selecting from cluster, collect the list of up or degraded servers in the cluster
		var agentsGr;
		if (contextGr.execute_on == MIDExtensionConstants.CHOICE_MID_SERVER_CLUSTER) {
			var clusterGr = new GlideRecord(_this.CLUSTER_TABLE);
			clusterGr.get(contextGr.mid_server_cluster);
			agentsGr = new GlideRecord(_this.CLUSTER_MEMBER_M2M);
			agentsGr.addQuery('cluster', contextGr.mid_server_cluster);
			agentsGr.query();
			while (agentsGr.next()) {
				if (isMidValidAndUp(agentsGr.agent)) {
					agents.push('' + agentsGr.agent);
				}
			}
		}
	}

	return agents;
}

function isMidValidAndUp(mid) {
	var gr = new GlideRecord('ecc_agent');
	if (!gr.get('sys_id', mid))
		return false;

	return (gr.validated === true || gr.validated.toLowerCase() == 'true') && ('' + gr.status == MIDExtensionConstants.AGENT_STATUS_UP);
}

})();
```