---
title: "IncidentUtils2SNC"
id: "incidentutils2snc"
---

API Name: global.IncidentUtils2SNC

```js
var IncidentUtils2SNC = Class.create();
IncidentUtils2SNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    initialize: function(request, responseXML, gc) {
        AbstractAjaxProcessor.prototype.initialize.call(this, request, responseXML, gc);
        this.incidentUtils = new global.IncidentUtils();
        this.log = new GSLog('com.snc.incident.copy.log', 'IncidentUtilsSNC');
    },

    ajaxFunction_getIncidentQueryParams: function() {
        var srcSysId = this.getParameter('sysparm_src_sysid');
        var uiActionType = this.getParameter('sysparm_ui_action');
        var attributesList = this.incidentUtils._getAttributeList();

        if (!attributesList)
            return false;

        var gr = new GlideRecord(this.incidentUtils.INCIDENT);
        if (gr.get(srcSysId))
            return this.incidentUtils._getRecordValuesAsEncodedQuery(gr, attributesList, uiActionType);
        else
            this.log.logErr('Invalid source incident sysid provided = ' + srcSysId);
    },

    ajaxFunction_makeIncidentCopy: function() {
        var srcSysId = this.getParameter('sysparm_sys_id');
        var gr = new GlideRecord(this.incidentUtils.INCIDENT);
        if (!(gr.get(srcSysId) && gr.canCreate())) {
            this.log.logErr('[makeIncidentCopy] : Invalid Source Incident SysId provided or Insufficient roles to copy the Incident');
            return false;
        }
        var fields = JSON.parse(this.getParameter('sysparm_fields'));
        var originalIncident = new GlideRecord(this.incidentUtils.INCIDENT);
        if (originalIncident.get(srcSysId)) {
            var attributeList = this.incidentUtils._getAttributeList();
            var incidentGr = this.incidentUtils._makeRecordCopy(originalIncident, attributeList);
            for (var fieldName in fields) {
                if (incidentGr.isValidField(fieldName))
                    incidentGr.setValue(fieldName, fields[fieldName]);
                else
                    this.log.logErr("[makeIncidentCopy] : " + fieldName + " is not a valid field on the Incident table.");
            }
            incidentGr[this.incidentUtils.ATTR_WORK_NOTES] = gs.getMessage("This Incident is copied from {0}", [originalIncident.getDisplayValue()]);
            if (incidentGr.insert()) {
                this.incidentUtils.copyIncidentAttachments(originalIncident.getUniqueValue(), incidentGr.getUniqueValue());
                this.incidentUtils.copyIncidentRelatedLists(originalIncident.getUniqueValue(), incidentGr.getUniqueValue());
                return incidentGr.getUniqueValue();
            } else
                this.log.logErr('Failed to copy Incident.');
        } else
            this.log.logErr('Invalid Source Incident SysId provided.');
        return false;
    },

    ajaxFunction_getKnowledgeGapMapping: function() {
        var incidentSysId = this.getParameter("sysparm_incident");
        var incGr = new GlideRecord("incident");
        if (incGr.get(incidentSysId)) {
            if (pm.isActive('com.snc.incident.knowledge')) {
                var map = new CSMTableMapUtil(incGr);
                map.findMapByName("incident_knowledge_gap_mapping");
                var targetQuery = map.getTargetQuery();
                if (targetQuery && targetQuery.length > 0)
                    return targetQuery[0];
                else
                    return null;
            } else {
                var query = "parent=" + incidentSysId + "^description=" + incGr.short_description + "^opened_by=" + gs.getUserID();
                return query;
            }
        }
        return null;
    },

    type: 'IncidentUtils2SNC'
});
```