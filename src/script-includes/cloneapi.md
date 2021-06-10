---
title: "CloneAPI"
id: "cloneapi"
---

API Name: global.CloneAPI

```js
var CloneAPI = Class.create();
CloneAPI.prototype = {
    initialize: function() {
    this._errorMessage = null;
    this.className = "CloneAPI";
    this.maxRetryCount = 3;
  },

  type: 'CloneAPI',

  isOracleClone: function() {
    var isOracle = false;
    var dbi = GlideDBConfiguration.getDBI("sys_dictionary");
    isOracle = dbi.isOracle();
    dbi.close();
    return isOracle;
  },

  isInAppCloneEligible: function(cloneGr) {
    var cloneId = cloneGr.getValue('clone_id');
    if(this.isOracleClone()) {
      gs.logError(cloneId + ": Fallback to in-app clone not supported for Oracle database", this.className);
      return false;
    }
    // provide property to explicitly block in-app clone for mysql based cloning
    var fallbackProp = 'glide.db.clone.fallback_inapp';
    var canFallback = gs.getProperty(fallbackProp, false);
    if (!canFallback || canFallback == 'false' || canFallback == '0') {
      gs.log( cloneId + ": Fallback to in-app clone disabled", this.className );
      return false;
    }
    var isSameVersion = this.isSameVersion(cloneGr.getValue("target_instance"));
    if(!isSameVersion) {
      gs.log(cloneId + ": " + this._errorMessage, this.className);
      return false;
    }
    if(this.isInAppCloneRunning()) {
      gs.log( cloneId + ": Clone cannot be started - an active clone is already running", this.className );
      return false;
    }
    this.logCloneMessage(cloneGr, /*info*/0, 'clone.log.info.inapp.eligible', cloneGr.getValue('clone_id'));
    return true;
  },

  scheduleInAppClone: function(cloneGr) {
    var cloneType = cloneGr.getValue('clone_type');
    var cloneId = cloneGr.getValue('clone_id');
    if(cloneType.equalsIgnoreCase('in-app') && this.isInAppCloneEligible(cloneGr)) {
      gs.log(cloneId + ': Starting in-app clone.', this.className);
      this.logCloneMessage(cloneGr, /*info*/0, 'clone.log.info.inapp.started', cloneGr.getValue('clone_id'));
      this._ensurePreferredNode(cloneGr);
      SncInstanceClone.startCloneViaClusterMessage(cloneGr);
    }
  },

  scheduleInstanceClone: function(table, sysId, retryCount) {
    var cloneGr = new GlideRecord(table);
    if ( !cloneGr.get(sysId) ) {
      gs.logError( "Clone record " + sysId + " not found in " + table, this.className );
      return;
    }
    var cloneId = cloneGr.getValue('clone_id');
    if(gs.nil(retryCount)) {
      retryCount = 0;
      // Fetch the war version from target and store it in source db
      this._updateWarVersion(cloneGr.getValue("target_instance"));
    }
    var notifiedServer = this._notifyServer(cloneGr);
    if(!notifiedServer) {
      gs.log(cloneId + ': Clone Scheduling failed. Retrying the scheduling.', this.className);
      this.retryInstanceCloneSchedule(table, sysId, ++retryCount);
    }
  },

  retryInstanceCloneSchedule: function(table, sysId, retryCount) {
    var cloneGr = new GlideRecord(table);
    if ( !cloneGr.get(sysId) ) 
      return;

    var cloneId = cloneGr.getValue('clone_id');
    if(!gs.nil(retryCount) && retryCount < this.maxRetryCount) {
      var waitingTimeInMins = parseInt((Math.pow(2,retryCount) - 1));
      var nextTime = new GlideDateTime();
      nextTime.addSeconds(60 * waitingTimeInMins);
      var schedule = new ScheduleOnce();
      schedule.setLabel( "Poll for schedule clone " + cloneId );
      schedule.setTime( nextTime );
      schedule.setSystemID( this._getSystemID(table, sysId) );
      schedule.script = "new CloneAPI().scheduleInstanceClone('" + table + "','" + sysId + "'," + retryCount + ");";
      var jobId = schedule.schedule();
      gs.log('Scheduled retry for clone ' + cloneId + ' after ' + waitingTimeInMins + ' mins with job id ' + jobId, this.className);
      return;
    }

    if(this.isInAppCloneEligible(cloneGr)) {
      gs.log('Converting clone ' + cloneId + ' to in-app clone as scheduling as backup based failed.', this.className);
      cloneGr.setValue('clone_type', 'in-app');
      cloneGr.setValue('state','Scheduled');
    } else {
      this.logCloneMessage(cloneGr, /*error*/2, 'clone.log.error.schedule.failure', cloneGr.getValue('clone_id'));
      gs.log('Max Retry limit reached for clone ' + cloneId + '. Marking the state as Hold.', this.className);
      cloneGr.setValue('state', 'Hold');
      cloneGr.setWorkflow(false);
    }

    cloneGr.update();
  },

  logCloneMessage: function(cloneGr, logLevel, msgKey, msgArgs) {

    var argsArray = [];
    
    if(gs.nil(cloneGr)) 
      return;

    if(!gs.nil(msgArgs)) 
      argsArray.push(msgArgs);

    SncCloneLogger.log(this.className, cloneGr.getValue('sys_id'), null, logLevel, gs.getMessage(msgKey, argsArray));
  },
  
  cancelClone: function(cloneGr) {
    var cloneType = cloneGr.getValue("clone_type");
    var cloneId = cloneGr.getValue('clone_id');
    var cloneSysId = cloneGr.getValue('sys_id');

    // Backup based clone
    if (gs.nil(cloneType) || cloneType.equalsIgnoreCase("backup-based")) {
      var jobId = new InstanceCloneScheduler().notifySchedulingServerForCancel(cloneGr);
      gs.log("Cancel Clone Scheduled with Job sysID " + jobId + " for Clone : " + cloneId, this.className);

      return !gs.nil(jobId);
    }

    // In-app based clone
    if (cloneType.equalsIgnoreCase("in-app")) {
      var instanceClone = new SncInstanceClone(cloneSysId);
      gs.log("Canceling in-app clone with clone record : " + cloneId, this.className);

      try {
        SncInstanceClone.stopCloneViaClusterMessage(cloneSysId);
        return true;
      } catch (e) {
        gs.log("Cancel Clone for in-app Clone " + cloneId + " Failed with exception " + e.getMessage(), this.className);
        return false;
      } 
    }
  },

  rollbackClone: function(cloneGr) {
    var cloneType = cloneGr.getValue("clone_type");
    var cloneId = cloneGr.getValue('clone_id');
    var cloneSysId = cloneGr.getValue('sys_id');

    // Backup based clone
    if (gs.nil(cloneType) || cloneType.equalsIgnoreCase("backup-based")) {
      var jobId = new InstanceCloneScheduler().notifySchedulingServerForRollback(cloneGr);
      gs.log("Rollback Clone Scheduled with Job sysID " + jobId + " for Clone : " + cloneId, this.className);

      return !gs.nil(jobId);
    }
    
    // In-app based clone
    if (cloneType.equalsIgnoreCase("in-app")) {
      var instanceClone = new SncInstanceClone(cloneSysId);
      gs.log("Rolling back in-app clone with clone record : " + cloneId, this.className);

      try {
        if (!instanceClone.canRollback()) {
          gs.log("Clone : " + cloneId + " cannot be rolled back.", this.className);
          return false;
        }

        SncInstanceRollback.rollback(cloneSysId);
        return true;
      } catch (e) {
        gs.log("Rollback Clone for in-app Clone " + cloneId + " Failed with exception " + e.getMessage(), this.className);
        return false;
      } 
    }
  },

  _ensurePreferredNode: function(gr) {
    var clusterNode = gr.getValue("cluster_node");
    if (!gs.nil(clusterNode))
      return;
    
    var instanceId = gr.getValue("target_instance");
    gs.log("CloneAPI: ensurePreferredNode against target instance " + instanceId);
    var nodeList = this.getNodesOnlineByLatency(instanceId);
    if (nodeList == null)
          return;
    
    clusterNode = nodeList[0];
    gs.log("CloneAPI: ensurePreferredNode against target instance " + instanceId + " got best node " + new global.JSON().encode(clusterNode));
    
    var clusterNodeID = typeof clusterNode === 'string' ? clusterNode : clusterNode.sys_id;
    gr.setValue("cluster_node", clusterNodeID);
    gr.setWorkflow(false); // don't fire business rules; we're updating some metadata fields
    gr.update();
  },
  
  getNodesOnlineByLatency: function(instanceId) {
    var sleepTime = 2000; // 2s
    var maxWait = 60000;  // max we'll wait is 60 seconds (60,000 milliseconds)
    var shouldWait = true;

    var checkGroup = this.runConnectionTest(instanceId, true);

    if (!checkGroup)
        return null;

    gs.sleep(sleepTime); // wait for cluster nodes to pick up message
    var startTime = new Date().getTime();

    while (shouldWait) {
        var currentTime = new Date().getTime();

        if ((currentTime - startTime) > maxWait) {
            gs.log("Max wait time reached when finding closest node... Exiting");
            break;
        }
        var gr = new GlideRecord('ha_connectivity_test');
        gr.addQuery('check_group', checkGroup);
        gr.addQuery('latency', '');
        gr.query();

        // if we're not waiting on any results, return the lowest latency
        if (gr.next() == false) {
            gs.log("CloneAPI: Results done - finding node with lowest latency...");
            return new HAAPIs()._findLowLatency(checkGroup);
        }

        gs.sleep(sleepTime); // wait 3 seconds
    }

    gs.log("Max wait time reached, not all nodes checked in. Returning fastest successful node...");
    return new HAAPIs()._findLowLatency(checkGroup, true);
  },
  
  runConnectionTest: function(instanceId) {
    var checkGroup = gs.generateGUID();
    var nodeList = new HAAPIs().getNodesOnline();
    for(var i = 0; i < nodeList.length; i++) {
        var node = nodeList[i];
        var ctgr = new GlideRecord("ha_connectivity_test");
        ctgr.state = 1;
        ctgr.check_group = checkGroup;
        ctgr.message = "Starting";
        ctgr.fast_check = true;
        ctgr.target_instance = instanceId;
        ctgr.cluster_node = node.sys_id;
        ctgr.insert();
    }
    return checkGroup;
  },

  isDBValid: function(instanceid) {
    return true;
  },

  getErrorMessage: function() {
    return this._errorMessage;
  },

  isCloneRunning: function() {
    return SncCloneUtils.isCloneRunning();
  },

  isInAppCloneRunning: function() {
    var cloneGr = new GlideRecord("clone");
    cloneGr.addQuery("state","Active");
    cloneGr.addQuery("clone_type","in-app");
    cloneGr.query();
    if (cloneGr.next())
      return true;
    else
      return false;
  },

  isSameVersion: function(instanceId) {
    var igr = new GlideRecord("instance");
    if ( !igr.get(instanceId) ) {
      gs.logError( "Instance record " + instanceId + " not found" );
      return false;
    }

    var remoteVersion = igr.getValue("war_version") + "";
    var myVersion = gs.getProperty("glide.war") + "";
    if ( !this._isSameVersion(myVersion, remoteVersion) ) {
      this._errorMessage = 'Instance "' + igr.instance_name + '" is currently on version "' + remoteVersion + '". The target instance needs to be upgraded to version "' + myVersion + '" before a clone request can be submitted.';
      return false;
    }

    return true;
  },

  _isSameVersion: function(myVersion, remoteVersion) {
    gs.log("CloneAPI isSameVersion: remoteVersion=" + remoteVersion + " vs myVersion=" + myVersion);

    if (!gs.nil(remoteVersion) && remoteVersion == 'null')
        remoteVersion = null;

    if (!gs.nil(myVersion) && myVersion == 'null')
        myVersion = null;

    if (gs.nil(remoteVersion) && gs.nil(myVersion))
        return true;

    if (!gs.nil(myVersion) && myVersion.indexOf('.') > -1)
        myVersion = myVersion.substring(0, myVersion.length-4);

    if (!gs.nil(remoteVersion) && remoteVersion.indexOf('.') > -1)
        remoteVersion = remoteVersion.substring(0, remoteVersion.length-4);

    if (myVersion == remoteVersion)
        return true;
    
    return false;
  },

  _beforeStartClone: function(cloneRecord) {
    // Fetch the war version from target and store it in source db
    this._updateWarVersion(cloneRecord.getValue("target_instance"));

    // contact clone web service
    var notifiedServer = this._notifyServer(cloneRecord);
    return notifiedServer;
  },
 
  _updateWarVersion: function(instanceId) {
    if (gs.nil(instanceId))
      return;

    var instanceGR = new GlideRecord("instance");
    if ( !instanceGR.get(instanceId) ) {
      gs.logError( "CloneAPI: Instance record " + instanceId + " not found in instance table" );
      return;
    }
    instanceGR.setWorkflow(false); // don't fire business rules; we're updating some metadata fields

  var instanceUrl = instanceGR.getValue("instance_url");
  var instanceName = instanceGR.getValue("instance_name");
  var user = instanceGR.getValue("admin_user");
  var secret = instanceGR.getValue("admin_password");
  var clearText = new GlideEncrypter().decrypt(secret);
  
    // Fetch the war version from target and store it in source db
  try {
    var version = this._getWarVersion(instanceUrl, user, clearText);
    instanceGR.setValue("war_version", version);
    instanceGR.setValue("validation_error", "");
    gs.log("Retrieved instance version: " + instanceName + " = " + version);
  } catch(e) {
    instanceGR.setValue("validation_error", "Failed to retrieve instance version: " + e.toString());
    gs.warn("Failed to obtain instance version: " + instanceName);
  }
  instanceGR.update();
  },

_getWarVersion: function(instanceUrl, user, pwd) {
  var getPropertyUrl = this._buildWSURL(instanceUrl, "GetProperty.do?SOAP");    
  
  var soapdoc = new SOAPEnvelope("GetProperty", "http://www.service-now.com/");
  soapdoc.setFunctionName("execute");
  soapdoc.addFunctionParameter("property", "glide.war");

  var soapRequest = new GlideInternalSoapClient(getPropertyUrl, user, pwd);
  soapRequest.setSOAPAction(soapdoc.functionName);
  soapRequest.postRequest(soapdoc.toString());
  var xmlStr = soapRequest.getResponseXML();
  gs.log("CloneAPI._getWarVersion getHTTPStatus=" + soapRequest.getHTTPStatus());   
  gs.log("CloneAPI._getWarVersion == " + xmlStr);
  
  if (soapRequest.getHTTPStatus() == 200) {
    var property = gs.getXMLText(xmlStr, "//executeResponse/property");
    if (!gs.nil(property))
      return property;
  }
  
  throw "httpStatus == " + soapRequest.getHTTPStatus() + ", httpResponse == " + xmlStr;
},

_buildWSURL: function(instance_url, page) {
  var url = instance_url+"";
  var http = "";
  var slash = "";
  if (url.charAt(url.length-1, 1) != '/')
    slash = "/";
  
  if (url.indexOf("http") != 0) {
    http = "http://";
    if (url.indexOf("localhost") == -1)
      http = "https://";
  }

  return http + url + slash + page;
},

  _notifyServer: function(cloneRecord) {
    var answer = false;
    try {
      if (new InstanceCloneScheduler().notifyServer(cloneRecord))
		  answer = true;
    } catch(e) {
       SncCloneLogger.log("InstanceClone", cloneRecord.sys_id, null, /*warn*/1, "Unable to contact server for confirmation: " + e.description);
    }
    return answer;
  }, 
 
  _isReadyState: function(cloneRecord) {
    return cloneRecord.getValue('state') == 'Requested' || cloneRecord.getValue('state') == 'Scheduled';
  },

  _isRequestedState: function(cloneRecord) {
    return cloneRecord.getValue('state') == 'Requested';
  },

  restartClone: function(cloneRecord) {
    var table = cloneRecord.sys_class_name+'';
    if( table != 'clone_instance' ) {
      gs.addErrorMessage( "Unable to restart clone: only Instance Clone records can be restarted (expected table 'clone_instance', actual table '" + table + "')" );
      return false;
    }
    
    var newCloneId = this._copyCloneRecord(cloneRecord);
    gs.log("CloneAPI: restartClone created new clone_instance record '" + newCloneId + "'");
    return newCloneId !== null;
  },      

  _copyCloneRecord: function(model) {
    var newClone = new GlideRecord("clone_instance");
    newClone.initialize();
    newClone.name = model.name;
    newClone.source_instance = model.source_instance; 
    newClone.target_instance = model.target_instance;
    newClone.exclude_large_data = model.exclude_large_data; 
    newClone.preserve_theme = model.preserve_theme; 
    newClone.filter_attachment_data = model.filter_attachment_data;
    newClone.security_token = model.security_token; 
    newClone.cluster_node = model.cluster_node; 
    newClone.email = model.email;
    newClone.setValue("scheduled", new GlideDateTime()); // now GMT
    newClone.state = 'Requested';
    newClone.megabytes_to_copy = model.megabytes_to_copy;
    newClone.duration = model.duration;
    newClone.retries = Math.max(model.retries, 0) + 1; // indicates this is a restart
    var newCloneId = newClone.insert();

    var sourceCloneId = model.getUniqueValue();
    this._copyPreservedData(sourceCloneId, newCloneId);

    return newCloneId;
  },
    
  _copyPreservedData: function(sourceCloneId, targetCloneId) {
    var preservedCount = 0;
    var grSourceData = new GlideRecord("clone_preserved_data");
    grSourceData.addQuery("clone", sourceCloneId);
    grSourceData.query();
    while (grSourceData.next()) {
      ++preservedCount;

      var payload = grSourceData.getValue("payload");
      var newPreservedData = new GlideRecord("clone_preserved_data");
      newPreservedData.initialize();
      newPreservedData.clone = targetCloneId;
      newPreservedData.payload = payload;
      newPreservedData.insert();
    }
    gs.print("CloneAPI: inserted " + preservedCount + " preserved data records for restarted clone " + targetCloneId);
  },
   
  _getSystemID: function(table, sysId) {
      var systemID = null;
    var cloneRecord = new GlideRecord(table);
    if (cloneRecord.get(sysId)) {
      var preferredNode = cloneRecord.getValue("cluster_node");
      if (!gs.nil(preferredNode)) {
          var clusterStateRecord = GlideClusterSynchronizer.getNodeById(preferredNode);
        if (clusterStateRecord != null && clusterStateRecord.status == "online")
          systemID = clusterStateRecord.system_id;
      }
    }
    return systemID;
  }
};
```