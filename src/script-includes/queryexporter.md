---
title: "QueryExporter"
id: "queryexporter"
---

API Name: global.QueryExporter

```js
var QueryExporter = Class.create();
QueryExporter.prototype = {

    exporterlogger: {

        init: function() {
            this.exportlog = '';
        },

        log: function(logMessage) {
            var formattedMsg = 'LOG: ' + logMessage + '\n';
            this.exportlog = this.exportlog + formattedMsg;
            gs.log(formattedMsg);
        },
        error: function(errorMessage){
            var formattedMsg = 'ERROR: ' + errorMessage + '\n';
            this.exportlog = this.exportlog + formattedMsg;
            gs.log(formattedMsg);
        },

        getLog: function(){
            return this.exportlog;
        }

    },

    initialize: function() {
        //get the tracker so we can send progress updates

        this.tracker = SNC.GlideExecutionTracker.getLastRunning();
		this.exporterlogger.init();
        //Publish data to the cureent UpdateSet
        this.newUpdateSetName = 'QueryExport ' + new GlideDateTime().toString();
        this.publisher = new CMDBUpdateSetPublisher(this.newUpdateSetName, this.exporterlogger);
        this.isPartial = false;
        this.intervalPercent = Math.floor((100 / this.queryList.length) / 12);
        this.removeUpdateSet = false;
		    this.advancedOnly = false;
    },

    exportQueryBasic: function(queryListStr, currentMode) {
		this.isPartial = currentMode;
		var queryList = queryListStr.split(',');
	    var basicExporter = new QueryDependencyExporter(queryList, this.publisher, this.tracker, this.intervalPercent, this.exporterlogger);
        try{
            basicExporter.exportData();
        }catch(error){
            this.exporterlogger.error('Fail to export due to:' + error);
            this.exportComplete(false);
            if(this.removeUpdateSet === true)
                CMDBUpdateSetPublisher.deleteUpdateSet(this.publisher.getUpdateSetId());
        }

        this.exportComplete(true);
        if(this.removeUpdateSet === true)
            CMDBUpdateSetPublisher.deleteUpdateSet(this.publisher.getUpdateSetId());
    },

    exportComplete: function(isSuccess){
        this.exporterlogger.log('exportComplete');
        if (isSuccess){
            this.publisher.complete();
            this.exporterlogger.log('UpdateSet id is: ' + this.publisher.getUpdateSetId());
            var gr = GlideRecord('sys_update_set');
            gr.addQuery("sys_id", this.publisher.getUpdateSetId());
            gr.addQuery("state", "complete");
            gr.query();

            var updateSetExport = new UpdateSetExport();
            if(gr.hasNext()) {
                gr.next();
                var currentGr = gr;
                this.exporterlogger.log('Exporting UpdateSet: ' + this.newUpdateSetName + ' to file');
                this.exportSysId = updateSetExport.exportHierarchy(currentGr);
                this.exporterlogger.log('Export XML sys_id: ' + this.exportSysId);
                var self = this;
                this.tracker.success('Export success');
                this.tracker.updateResult(
                    {
                        exportResult: self.exporterlogger.getLog(),
                        exportSysId: self.exportSysId,
                        updateSetId: self.publisher.getUpdateSetId()
                    });

            }else{
                this.exporterlogger.error('Exporting UpdateSet: ' + this.newUpdateSetName + ' to file failed');
                this.tracker.fail("Export failed");
            }

        }
        else{
            this.tracker.fail("Export failed");
            this.tracker.updateResult(
                {
                    exportResult: this.exporterlogger.getLog(),
                });
        }

        gs.log(this.exporterlogger.getLog());
        this.publisher.accomplish();

    },

    /*
	This flag added for testing purpose
	By setting this flag to false we are not removing the created UpdateSet after export is completed
	*/
    setRemoveUpdateSet: function(removeUpdateSet){
        this.removeUpdateSet = removeUpdateSet;
    },

	/*
	This flag added for testing purpose
	By setting this flag to true we are not exporting the data that included in Basic Export
	*/
    setAdvancedOnly: function(advancedOnly){
        this.advancedOnly = advancedOnly;
    },

    type: 'QueryExporter'
};

```