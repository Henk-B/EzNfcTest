/*
    Chat Example for Bluetooth Serial PhoneGap Plugin
    http://github.com/don/BluetoothSerial

    Copyright 2013 Don Coleman

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/* jshint quotmark: false, unused: vars */
/* global cordova, bluetoothSerial, listButton, connectButton, sendButton, disconnectButton */
/* global chatform, deviceList, message, messages, statusMessage, chat, connection */

String.prototype.getBytes = function () {
  var bytes = [];
  for (var i = 0; i < this.length; ++i) {
    bytes.push(this.charCodeAt(i));
  }
  return bytes;
};

'use strict';

var app = 
{
  initialize: function()
  {
    deviceReady = false;
    
    remoteDevice = "";
    remoteName = "";

    this.bind();
  },
  
  bind: function()
  {
    listBusy = false;
    document.addEventListener('deviceready', this.deviceready, false);
    document.addEventListener("pause", this.suspend, false);
    document.addEventListener("resume", this.resume, false);
    
    $(document).ready(function()
    {
      //app.ondisconnect();
    });
  },
  
  deviceready: function()
  {
    console.log("deviceready");
    deviceReady = true;
    suspended = false;
    debugmessages.value = "";
    connecting = false;

    // note that this is an event handler so the scope is that of the event
    // so we need to call app.foo(), and not this.foo()

    // wire buttons to functions
    connectQrButton.onclick = app.connect_qr;

  },
  
  suspend: function()
  {
    suspended = true;
  },
  
  resume: function()
  {
    suspended = false;
    
    //app.setStatus("Resuming...");

    try
    {
    }
    catch(e)
    {}
    
  },
  
  connect_qr: function()
  {
    if(!deviceReady)
      return;
    
    var scansuccess = function (result)
    {
      remoteDevice = result.text;
      remoteName = "HC-05 (" + result.text + ")";
      if(!result.cancelled)
      {
        connecting = true;
        app.setStatus("Connecting to " + remoteName + "...");
        //bluetoothSerial.connect(remoteDevice, app.onconnect, app.ondisconnect);
      }
    };
    var scanner = cordova.require("cordova/plugin/BarcodeScanner");    
    scanner.scan(scansuccess);
  },
  
  setStatus: function(message)
  {
    console.log(message); 
    if(debugmessages !== undefined)
    {
      debugmessages.value += message + "\n";
      debugmessages.scrollTop = debugmessages.scrollHeight;
    }

    window.clearTimeout(app.statusTimeout);
    $('div.statusMessage').html(message);
    $('div.statusMessage').removeClass('fadeout');
    $('div.statusMessage').addClass('fadein');

    // automatically clear the status with a timer
    app.statusTimeout = setTimeout(function ()
    {
      $('div.statusMessage').removeClass('fadein');
      $('div.statusMessage').addClass('fadeout');
    }, 5000);
  },
    
  enable: function(button)
  {
    button.className = button.className.replace(/\bui-state-disabled\b/g,'');
    //button.removeClass("ui-state-disabled");
  },
  
  disable: function(button)
  {
    //button.addClass("ui-state-disabled");
    if(!button.className.match(/ui-state-disabled/))
    {
      button.className += " ui-state-disabled";
    }
  },
  
  generateFailureFunction: function(message)
  {
    var func = function(reason)
    {
      var details = "";
      if (reason)
      {
        details += ": " + JSON.stringify(reason);
      }
      app.setStatus(message + details);
    };
    return func;
  }
};
