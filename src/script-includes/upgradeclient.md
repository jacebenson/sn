---
title: "UpgradeClient"
id: "upgradeclient"
---

API Name: global.UpgradeClient

```js
gs.include("PrototypeServer");

var UpgradeClient = Class.create();

// This variable is used in upgrade_complete.js to check if upgrade_complete was invoked from upgrade client or directly
var upgradeStartedByUpgradeClient = true;

/**
 * There are several entry points on this script:
 * 
 * 1) process <- DistUpgrade, the process of upgrading code (ie: WAR)
 * 2) upgradeScript <- DataUpgrade, the process of upgrading data on the first boot with the new code (ie: DB records, etc.)
 * 3) runUpdateScript <- A partial DistUpgrade used for cluster upgrades (called via ClusterMessage)
 * 
 * This will be separated into two scripts (upgrade vs. update) when war upgrade functionality is removed (and only dist functionality is available).
 */
UpgradeClient.prototype = {
   UPGRADE_VERSION : 'glide.war.assigned',
   WAR_VERSION : 'glide.war',
   BUILD_VERSION: 'glide.node.dist',
   NO_UPGRADE_VERSION : 'glide.war.no_upgrade', // set by Rollback
   UPGRADE_SCRIPT : gs.getProperty("glide.sys.upgrade_script"),
   LOGGER : new UpgradeLogger(),
   
   initialize: function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      this.upgrade_server_url = gs.getProperty("upgrade_server_url");
      this.instance_id = gs.getProperty("instance_id");
   },
   
   // Called from event: Upgrade
   upgradeScript : function() {
		gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
		SNC.UpgradeAPI.dbUpgradeAfterCheck();
   },
   
   execUpgrade : function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release"); 
      gs.loadBatchScript("sys.scripts/" + this.UPGRADE_SCRIPT);
   },
   
   notifySuccess : function(desired) {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      SNC.UpgradeAPI.notifySuccess(desired);
   },
   
   // Since .zip.war's are not "first-class" artifacts, and since older glide
   // UpgradeClient versions (which cannot be changed since we must support a
   // one-step upgrade) write .zip.war into these DB properties, they need to 
   // be "corrected" to .zip before they are read by the new UpgradeClient
   // version.
   sanitizeDBProperties: function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      var war_version = gs.getProperty(this.WAR_VERSION)
      if (war_version != null && war_version.match(/\.zip\.war$/)) {
         this.LOGGER.log("Converting " + this.WAR_VERSION + " from .zip.war to a .zip (" + war_version + ")");
         war_version = war_version.replace(/\.zip\.war$/, ".zip");
	     gs.setProperty(this.WAR_VERSION, war_version, "Current Version");
	  }
      var upgrade_version = gs.getProperty(this.UPGRADE_VERSION)
      if (upgrade_version != null && upgrade_version.match(/\.zip\.war$/)) {
         this.LOGGER.log("Converting " + this.UPGRADE_VERSION + " from .zip.war to a .zip (" + upgrade_version + ")");
         upgrade_version = upgrade_version.replace(/\.zip\.war$/, ".zip");
	     gs.setProperty(this.UPGRADE_VERSION, upgrade_version, "Assigned version");
	  }	   
   },
   
   // Called from script include: UpgradeClient
   process: function() {
		gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
		SNC.UpgradeAPI.distDBUpgradeAfterCheck();
   },
   
   processWar: function(war_file) {
         gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
         var ujob = new GlideWarDownloader();
         var success = ujob.downloadWar(war_file);
         if (success)
            this.LOGGER.log("Successful download of " + war_file);
         else {
            this.LOGGER.log("Failed to download " + war_file + ". Will retry in 1 hour");
            return;
         }
         gs.setProperty(this.UPGRADE_VERSION, war_file, "Assigned version");
         new GlideWarDeleter().deleteOldWars(war_file);
         
         this.shutdownAndRestart(war_file);
   },
   
   processDist: function(dist_file) {
       gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
	   var manager = new GlideUpgradeArtifactManager();
	   var success = manager.download(dist_file);
	   if (success)
		   this.LOGGER.log("Successful download of " + dist_file);
	   else {
		   this.LOGGER.log("Failed to download " + dist_file + ". Will retry in 1 hour");
		   return;
	   }
	   gs.setProperty(this.UPGRADE_VERSION, dist_file, "Assigned version");
	   manager.deleteArtifactsExcept(dist_file);
	   
	   this.shutdownAndRestart(dist_file);
   },
   
   shutdownAndRestart : function(artifact_filename) {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      // find our startup Job and set it to run on our node on next restart
      this.LOGGER.log("Assigning upgrade startup job to this cluster node, " + GlideServlet.getSystemID());
      this.setStartupJob();
      
      // reschedule the upgrade job in the future... this needs to happen before the scheduler
      // is shutdown, otherwise the recover stuck jobs code will revert our schedule/claimed_by
      this.LOGGER.log("Rescheduling the upgrade job");
      this.setUpgradeJob();
      
      try {
            // Send a beat to indicate the node is still online
            new global.EventHeartbeat().beat();
      } catch (e) {
            this.LOGGER.warn(this.UPGRADE_SCRIPT + " Could not send Heartbeat before shutdownAndRestart: " + e.toString());
      }
      
      //report node.dist.upgrade OPEN event for this node, next server restart will report 
      //node.dist.upgrade close event from a sys_trigger
      SNC.UpgradeUtil.reportNodeDistUpgradeOpenEvent("Upgrading to " + artifact_filename);
      
      //record node upgrade start event
      SNC.UpgradeUtil.recordNodeUpgradeStartForLUA(artifact_filename);
      
      this.LOGGER.log("Shutting down workers and cluster synchronizer");
      // shut down everything
      GlideSystemStatus.setShuttingDown();
      GlideWorkerThreadManager.get().shutdownEverything();
      gs.sleep(10000); // wait 10 seconds to give things an opportunity to shut down gracefully
      
      // Tell our peer cluster nodes and replication slaves that a new war has arrived,
      // and they need to follow suit.
      this.notifyPeers(artifact_filename);
      
      this.runUpdateScript(artifact_filename);
   },
   
   // Tell our peer cluster nodes and replication slaves that a new war has arrived,
   // and they need to follow suit.
   notifyPeers: function(artifact_filename) {
		gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
		SNC.UpgradeAPI.notifyPeers(artifact_filename);
   },
   
   // Called from Upgrade
   runUpdateScript: function(artifact_filename) {
		gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
		SNC.UpgradeAPI.runDistUpgrade(artifact_filename);
   },
   
   setStartupJob : function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      var gr = new GlideRecord("sys_trigger");
      gr.addQuery("name", "Check database for possible upgrade");
      gr.query();
      if (gr.next()) {
         var myID = GlideServlet.getSystemID();
         gr.system_id = myID;
         gr.update();
      }
   },
   
   setUpgradeJob : function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      var nextAction = gs.hoursAgo(-1); // set the next action to be an hour ahead
      this.LOGGER.log('Rescheduling next action for ' + nextAction);

      // Access the global schedule record:
      if (typeof g_schedule_record != 'undefined') {
        var gr = g_schedule_record;

        gr.next_action.setValue(nextAction); 
        gr.claimed_by = null;
        gr.state = 0;
        gr.update();

      } else {
        gs.log("WARNING: 'g_schedule_record' is undefined, unable to reschedule upgrade job")
      }
   },
   
   getWarFile: function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      // create the soap document
      var soapdoc = new SOAPEnvelope("GetWarFile", "http://www.service-now.com/");
      soapdoc.setFunctionName("execute");
      soapdoc.addFunctionParameter("instance_id", this.instance_id);
      soapdoc.addFunctionParameter("current_war", SNC.UpgradeUtil.getCurrentBuild());
      
      // post the request
      var soapRequest = new SOAPRequest(this.upgrade_server_url + "GetWarFile.do?SOAP");
      var soapResponse = soapRequest.post(soapdoc);
      var war_file = gs.getXMLText(soapResponse, "//executeResponse/war_file");
      
      return war_file;
   },

   // Check if it is a developer instance or if the instance id is null.
   // Return true if the instance has no id or it is a developer instance, otherwise, return false.
   // Error will be logged in case of null instance id.
   _shouldSkip: function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      if (this._isDeveloperInstance()) {
        this.LOGGER.log("Developer instance - skipped upgrade");
        return true;
      } else if (GlideJSUtil.isNilJavaObject(this.instance_id)) {
        this.LOGGER.error("Instance ID is null - skipped upgrade");
        return true;
      }
      return false;
   },

   // Check if the instance is a developer instance - test seam
   _isDeveloperInstance: function() {
      gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
      return GlideUtil.isDeveloperInstance();
   },

	/**
	 * Checks the current, assigned and revertedFrom WAR values and determines if upgrade needs to run
 	 * @returns {boolean} true if upgrade needs to be run, false otherwise
	 */
	shouldRunUpgrade: function() {
		gs.warn("DEPRECATED API: The UpgradeClient Script Include has been deprecated, and will be removed in a future release");
		var desired = gs.getProperty(this.UPGRADE_VERSION);
		if (!desired) {
			this.LOGGER.log('No desired war specified. Upgrade will not run');
			return false;
		}
		var current = gs.getProperty(this.WAR_VERSION);
		var revertedFrom = gs.getProperty(this.NO_UPGRADE_VERSION);
		if (!current) {
			this.LOGGER.log('No current war specified. Upgrade will run and set current war');
		} else if (current == desired) {
			this.LOGGER.log('Already on desired war ' + desired +'. Upgrade will NOT run');
			return false;
		} else if (desired == revertedFrom) {
			this.LOGGER.log('Desired war matches reverted war specified by property [' + this.NO_UPGRADE_VERSION + ']. Upgrade script will NOT run');
			return false;
		}

		// check if glide.war.assigned matches the distribution build version in glide.node.dist.
		var build_version = GlideProperties.get(this.BUILD_VERSION);
		// skip comparing if build version is not set
		if (!build_version)
			return true;

		// glide.node.dist doesn't contain .war or .zip suffix, so we ignore comparing that part
		var desired_no_suffix = desired.replace(/\.war$/, "");
		desired_no_suffix = desired_no_suffix.replace(/\.zip$/, "");
		if (desired_no_suffix != build_version) {
		    this.LOGGER.error('The desired war does not match the distribution build, desired war (without suffix): ' + desired_no_suffix + ', distribution build: ' + build_version + '. Upgrade will not run');
			return false;
		}
		return true;
	},
   
};
```