---
title: "ScheduleSpanManagerSNC"
id: "schedulespanmanagersnc"
---

API Name: global.ScheduleSpanManagerSNC

```js

    var ScheduleSpanManagerSNC = Class.create();
    ScheduleSpanManagerSNC.prototype = {
		initialize: function() {
		},
		UTC_TZ_INDICATOR: 'Z',
		
		getUpdatedScheduleSpanTimeZone: function(schedule, fromTimeZone, toTimeZone){
			var grSpan = new GlideRecord("cmn_schedule_span");
			grSpan.addQuery("schedule", schedule);
			grSpan.query();
			
			while(grSpan.next()){
				var convertedStartTime = this._updateTimeZone(grSpan.start_date_time, fromTimeZone, toTimeZone);
				var convertedEndTime = this._updateTimeZone(grSpan.end_date_time, fromTimeZone, toTimeZone);
				if(!gs.nil(convertedStartTime) && !gs.nil(convertedEndTime)){
					grSpan.setValue("start_date_time", convertedStartTime);
					grSpan.setValue("end_date_time", convertedEndTime);
					grSpan.update();
				}
			}
		},
		_updateTimeZone: function(dateTime, fromTimeZone, toTimeZone){
			if(gs.nil(dateTime))
				return dateTime;
			
			var span = new GlideScheduleDateTime();
			span.setValue(dateTime);// TimeZone is based on the JVM instance
			
			if(gs.nil(fromTimeZone)){// floating to Different TimeZone
				span.setTimeZone(toTimeZone);
				return span.getValueInternal(); // Internal gets value in UTC
			}else if(gs.nil(toTimeZone)){ // Time Zone A to Floating
				span.setTimeZone(fromTimeZone);
				var convertedTimeWithTimeZoneIndicator =  span.getValue(); // gets value in corresponding TimeZone 
				if(convertedTimeWithTimeZoneIndicator.endsWith(this.UTC_TZ_INDICATOR))
					return convertedTimeWithTimeZoneIndicator.slice(0, -1); //remove "Z" Time Zone Indicator
				return convertedTimeWithTimeZoneIndicator;
			}else { //Time Zone A to Time Zone B
				return "";
			}
		},
		type: 'ScheduleSpanManagerSNC'
	};

```