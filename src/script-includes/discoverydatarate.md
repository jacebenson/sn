---
title: "DiscoveryDataRate"
id: "discoverydatarate"
---

API Name: global.DiscoveryDataRate

```js
(function() {


	//Ref: http://snia.org/sites/default/files/SMI-Sv1.5r6_CommonProfiles.book_.pdf
	// Ref :https://www.dellemc.com/en-us/collaterals/unauth/technical-guides-support-information/products/networking-4/docu68885.pdf
	//Fiber Channel port speeds are calculated using a multiplier of 1143535043,which is 1GB * 1.065
	// for SNIA following devices, 1 GB is considered as 1000000000 and for non SNIA devices , 1GB is considered as
	// 1073741820. Eg.- EMC does not follow SNIA standard for fibre channel speed calculation.


	var units = {
		B: 1,
		K: 1000,
		M: 1000000,
		G: 1000000000,
		T: 1000000000000
	},
	gfc = {
		1062500000: 1,		//When 1GB = 1000000000
		1143535043: 1,		//When 1GB = 1073741820
		2125000000: 2,
		2287070086: 2,
		4250000000: 4,
		4574140172: 4,
            	8500000000: 8,
		9148280344: 8,
            	10518750000: 10,
		11435350430: 10,
            	14025000000: 16,
		18296560688: 16,
            	21037500000: 20,
		22870700860: 20,
           	28500000000: 32,
		36593121376: 32,
		73186242752: 64,
		114000000000: 128,
		146372485504: 128,
		292744971008: 256
	};

/**
 * Converts data rates to Gbps.
 *
 * @since fuji
 * @author roy.laurie
 *
 * @param number|string rate
 * @param string unitOfMeasurement  Optional unit of measurement.
 *
 * The parsing of units is pretty lax, by design.  'GFC' is special-cased using
 * the gfc table above.  Otherwise, the first character of the unit is converted
 * to upper case and we look for the multiplier in the 'units' table above.  This
 * means, for example, that anything that starts with 'm' is considers Megabits.
 *
 * This class previously translated between units.
 *
 * Note that DiscoveryDataRate is being assigned to an undeclared global variable
 * to export it from the closure.
 */
DiscoveryDataRate = function(rate, unit) {
	this.bytesPerSecond = getBps(rate, unit);
}

DiscoveryDataRate.prototype.to = function() {
	return DiscoveryDataRate.toGFC(this.bytesPerSecond);
}

    DiscoveryDataRate.toGFC = function(rate, unit) {
	if (!rate)
		return 'Unknown';
	if (gs.nil(unit))
		unit = "GFC";
        if (rate in gfc)
		return gfc[rate];


	// The lazy man's way to round to 3 digits:
	// Get the rate (as a string) rounded to 3 digits
	rate = (getBps(rate, unit) / units.G).toFixed(3);

	// Parse the string back into a number, then re-convert
	// to a string to get rid of trailing 0s.
	return parseFloat(rate);
}

// Allowed units: B, K, M, G, T, GFC
// No unit, < 100 implies G, otherwise B
function getBps(rate, unit) {

	if (!unit && typeof rate == 'string')
		unit = rate.split(/\s+/)[1];

	unit = unit && unit.trim();

	rate = parseFloat(rate);

	// Special case for GFC.
	if (unit == 'GFC') {
		rate = gfc[rate] || rate;
		if (rate > 10000)
			rate /= 1062500000;

		unit = 'G'
	}

	if (!unit)
		unit = (rate < 10000) ? 'G' : 'B';

	unit = unit.charAt(0).toUpperCase();

	return rate * units[unit];
}

})();
```