---
title: "OnCallUserReminder"
id: "oncalluserreminder"
---

API Name: global.OnCallUserReminder

```js
var OnCallUserReminder = Class.create();

OnCallUserReminder.prototype = {
   
  OCR_REMINDERS_SHOWTZ: 'com.snc.on_call_rotation.reminders.showtz',
  OCR_REMINDERS_LOG: 'com.snc.on_call_rotation.reminders.log',
   
  initialize : function() {
     this.entries = {}; // entry per {group,rota,roster}
     this.userTimeZone = '';
     this.lu = new GSLog(this.OCR_REMINDERS_LOG, this.type);
     this.showTZ = gs.getProperty(this.OCR_REMINDERS_SHOWTZ, 'false') == 'true';
  },
	
  /**
   *
   * Adds/updates the arguments passed to it to this.entries
   *
   */
  addOnCall: function(group, rota, roster, timespan, userTimeZone) {
     var key = 'group:' + group + ';rota:' + rota + ';roster:' + roster;
     var entry = {};
     var timeSpanList = [];
     if (!this.entries[key]) {
        entry['group'] = group;
        entry['rota'] = rota;
        entry['roster'] = roster;
        timeSpanList.push(timespan);
        entry['timespans'] = timeSpanList;
        this.userTimeZone = userTimeZone;
        this.entries[key] = entry;
     }
     else {
        entry = this.entries[key];
        timeSpanList = entry['timespans'];
        timeSpanList.push(timespan);
     }
  },

   /**
    * 
    * Combine timeSpanLists (for each identical entry key) into a consolidated list of ScheduleDateTimeSpan if the times can be combined.
    * This assumes that the spans in the list appear in the order by start time.  Note that differences of one second are 
    * forgiven.
    * 
    * For example, these two spans:
    *           2008-03-17 00:00:00 - 2008-03-17 23:59:59
    *           2008-03-18 00:00:00 - 2008-03-18 23:59:59
    * Will be combined into a single span:
    *           2008-03-17 00:00:00 - 2008-03-18 23:59:59
    */
   combineSpans: function() {
      for (var key in this.entries) {
         var newSpans = [];
         //gs.print("combineSpans: " + key);
         var entry = this.entries[key];
         var timeSpanList = entry['timespans'];
         if (timeSpanList.length == 0) {
            // entry['timespans'] = newSpans;
            return;
         }
         var priorSpan = timeSpanList[0];
         for (var i=1; i<timeSpanList.length; i++) {
            var thisSpan = timeSpanList[i];
            var adjacentTo = priorSpan.adjacentTo(thisSpan);
            if (adjacentTo == 1) { // prior span starts immediately prior to this span?
               if (priorSpan.getEnd().compareTo(thisSpan.getEnd()) == -1) // this time has a later end time so use it
                  priorSpan.setEnd(thisSpan.getEnd());
            } else {
               newSpans.push(priorSpan);
               priorSpan = thisSpan;
            }
         }
         newSpans.push(priorSpan);
         entry['timespans'] = newSpans;
      }
   },

  // XXX: should store userTimeZone within the entry itself
  toStringTZ: function(userTimeZone) {
     var times = "";
     for (var key in this.entries) {
        var entry = this.entries[key];
        var group = entry['group'];
        var rota  = entry['rota'];
        var roster= entry['roster'];
        var timeSpanList = entry['timespans'];

        times += "\n";
        times += this.grrToText(group, rota, roster);
        times += "\n";

        for (var i=0; i<timeSpanList.length; i++) {
           var span = timeSpanList[i]; // span is a com.glide.schedules.ScheduleDateTimeSpan
           var span_text = this.spanToText(span, userTimeZone);
           if (i > 0)
              times += "\n";
           times += span_text;
        }
     }
     return times;
  },
	
  /**
   *
   * Takes ScheduleDateTimeSpan and time zone and returns the String representation of the ScheduleDateTimeSpan 
   *
   */
  spanToText: function(span, userTimeZone) {
     var fromTimeText = this.toTimeZoneText(span.getStart(), userTimeZone);
     var toTimeText = this.toTimeZoneText(span.getEnd(), userTimeZone);
     var toText = gs.getMessage("to");
     var span_text = fromTimeText + " " + toText + " " + toTimeText;
     if (this.showTZ || this.lu.debugOn())
        span_text += " [" + userTimeZone + "]";
     return span_text;
  },
	
  /**
   *
   * Takes ScheduleDateTime sdt and time zone and returns the String representation of the sdt
   *
   */
  toTimeZoneText: function(sdt, timeZone) {
     sdt.setTimeZone(timeZone);
     var tzID = sdt.getTimeZone();
     var gdt = sdt.getGlideDateTime();
     gdt.setDebugTZ(tzID);
     return gdt.getDisplayValue() + '';
  },
	
  /**
   *
   * Takes sys_id of sys_user_group, cmn_rota and cmn_rota_roster records and 
   * returns the String representation of the associated records separated by comma.
   *
   */
  grrToText: function( groupId, rotaId, rosterId ) {
     var toText = "";
     var gr = new GlideRecord('sys_user_group');
     if (gr.get(groupId))
       toText += gr.name;
     gr = new GlideRecord('cmn_rota');
     if (gr.get(rotaId)) {
       toText += ", " + gr.name;
     }
     if (typeof(rosterId) != 'undefined') {
       gr = new GlideRecord('cmn_rota_roster');
       if (gr.get(rosterId))
          toText += ", " + gr.name;
     }
     return toText;
  },

  type: 'OnCallUserReminder'
};
```