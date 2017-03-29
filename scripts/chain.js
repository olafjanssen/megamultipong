/* global HydnaChannel */

/**
 * Chain.js is a library to assist anyone with taking part in the S4 chain reaction workshop.
 *
 * Depends on Hydna library to connect to its pub/sub service.
 *
 * @author Olaf Janssen <olaf.janssen@fontys.nl>
 */

var chain = (function () {
    'use strict';

    var channel = new HydnaChannel('http://fhict-s4.hydna.net', 'rw'),
        position = -1;

    return {

        /**
         * Start listening to changes in the chain position.
         * When a messages arrives for the user's position the callback is called and the user can start it's chain animation.
         * @param station   The unique station to communicate over
         * @param pos       The position of the user in the chain (0 is the start of the link).
         * @param callback  The function to be called when it's the users' turn in the chain.
         */
        listen: function (station, pos, callback) {
            position = pos;

            // listen to messages and respond if the current link in the chain is that of the user
            channel.onmessage = function (event) {
                var data = JSON.parse(event.data);
                if (data.station === station && data.position === pos) {
                    callback(data.data);
                }
            };
        },

        /**
         * Function to be called when the user's chain animation has finished and the next link in the chain should start.
         * Publishes a messages on the channel with the updates position.
         */
        send: function (station, pos, data) {
            var o = {station: station, position: pos, data: data};
            channel.send(JSON.stringify(o));
        }
    };

}());
