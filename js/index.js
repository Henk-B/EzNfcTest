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
    connectButton.onclick = app.connect;
    connectQrButton.onclick = app.connect_qr;
    listButton.onclick = app.list;
    disconnectBtn.onclick = app.disconnect;

    bluetoothSerial.isEnabled(function(){}, function(){app.setStatus("Bluetooth is not enabled");});
    
    // listen for messages
    bluetoothSerial.subscribe("\n", app.onmessage, app.generateFailureFunction("Subscribe Failed"));

    setTimeout(app.list, 1000);   // get a list of peers
  },
  
  suspend: function()
  {
    suspended = true;
  },
  
  resume: function()
  {
    suspended = false;
    
    if(!deviceReady || connecting)
      return;
    
    //app.setStatus("Resuming...");

    try
    {
      var isNotConnected = function ()
      {
        // Try to reconnect
        app.setStatus("Reconnecting to " + remoteDevice + " ...");
        app.list();
      };
      
      bluetoothSerial.isConnected(function(){}, isNotConnected);
    }
    catch(e)
    {}
    
  },
  
  list: function(event)
  {
    if(!deviceReady)
      return;
    
    if(listBusy)
    {
      app.setStatus("Discovery runnning ...");
      return;
    }

    var listFailed = function ()
    {
      listBusy = false;
      app.enable(listButton);
      app.generateFailureFunction("List Failed");
    };
    
    remoteDevice = window.localStorage.getItem("bluetooth");
    if(remoteDevice != null)
    {
      window.localStorage.removeItem("bluetooth");
      
      connecting = true;
      app.disable(connectButton);
      app.setStatus("Connecting to " + remoteDevice + " ...");
      try
      {
        bluetoothSerial.connect(remoteDevice, app.onconnect, app.ondisconnect);
      }
      catch(e)
      {}
    }
    else
    {
      app.setStatus("Looking for Bluetooth Devices...");
      app.disable(connectButton);
      try
      {
        listBusy = true;
        app.disable(listButton);
        
        bluetoothSerial.list(app.ondevicelist, listFailed);
      }
      catch(e)
      {
        listFailed();
      }
      
      deviceList.innerHTML = "";
      var option = document.createElement('option');
      option.innerHTML = "Discovering...";
      option.value = "0";
      deviceList.appendChild(option);

      if($('#deviceList').selectmenu('instance') !== undefined)
        $('#deviceList').selectmenu('refresh');
    }
  },
  
  connect: function(device)
  {
    if(!deviceReady)
      return;
    
    remoteDevice = deviceList[deviceList.selectedIndex].value;
    remoteName = deviceList[deviceList.selectedIndex].innerHTML;
    if(remoteDevice != '0')
    {
      connecting = true;
      app.setStatus("Connecting to " + remoteName + "...");
      bluetoothSerial.connect(remoteDevice, app.onconnect, app.ondisconnect);
    }
    else
    {
      app.list();
    }
    app.disable(connectButton);
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
        bluetoothSerial.connect(remoteDevice, app.onconnect, app.ondisconnect);
      }
    };
    var scanner = cordova.require("cordova/plugin/BarcodeScanner");    
    scanner.scan(scansuccess);
  },
  
  disconnect: function(bye)
  {
    if(!deviceReady)
      return;

    try
    {
      var isConnected = function ()
      {
        app.disable(disconnectBtn);
        app.setStatus("Disconnecting...");
        if(bye === undefined)
          bluetoothSerial.disconnect(app.ondisconnect);
        else
          bluetoothSerial.disconnect();
      };
      
      bluetoothSerial.isConnected(isConnected);
    }
    catch(e)
    {}
  },
  
  pollWeight: function()
  {
    if(!deviceReady || suspended)
      return;
    
    try
    {
      var isConnected = function ()
      {
        var text = "$WGT?\n";
    
        bluetoothSerial.write(text);
      };
      
      bluetoothSerial.isConnected(isConnected);
    }
    catch(e)
    {}
  },
  
  ondevicelist: function(devices)
  {
    var option;
    listBusy = false;
    app.enable(listButton);
    
    // remove existing devices
    deviceList.innerHTML = "";
    app.setStatus("");

    var previousDevice = window.localStorage.getItem("bluetoothLast");

    devices.forEach(function(device)
    {
      option = document.createElement('option');
      if (device.hasOwnProperty("uuid"))
      {
        option.value = device.uuid;
      }
      else if (device.hasOwnProperty("address"))
      {
        option.value = device.address;
      }
      else
      {
        option.value = "ERROR " + JSON.stringify(device);
      }
      if(device.name == "HC-05")
        option.innerHTML = device.name + " (" + device.address + ")";
      else
        option.innerHTML = device.name;
      deviceList.appendChild(option);
      
      if(option.value == remoteDevice)
        deviceList.selectedIndex = deviceList.length;
      else if((option.value == previousDevice) && (deviceList.selectedIndex == -1))
        deviceList.selectedIndex = deviceList.length;
    });
    
    if($('#deviceList').selectmenu('instance') !== undefined)
      $('#deviceList').selectmenu('refresh');
    
    if (devices.length === 0)
    {
      option = document.createElement('option');
      option.innerHTML = "No Bluetooth Devices";
      deviceList.appendChild(option);
      if($('#deviceList').selectmenu('instance') !== undefined)
        $('#deviceList').selectmenu('refresh');
      
      if (cordova.platformId === "ios") // BLE
      {
        app.setStatus("No Bluetooth Peripherals Discovered.");
      }
      else  // Android
      {
        app.setStatus("Please Pair a Bluetooth Device.");
      }
      
      app.disable(connectButton);
    }
    else
    {
      //bluetoothSerial.isConnected(function(){}, function(){app.enable(connectButton);});
      app.enable(connectButton);
      app.setStatus("Found " + devices.length + (devices.length === 1 ? " device." : " devices."));
    }
  },
  
  onconnect: function()
  {
    connecting = false;
      
    app.setStatus("Connected to " + remoteName);
    app.enable(disconnectBtn);
    app.enable(connectIcon);
    
    if(remoteDevice)
      window.localStorage.setItem("bluetooth", remoteDevice);

    window.localStorage.setItem("bluetoothLast", remoteDevice);
    
    var firstpoll = function ()
    {
      app.sendDataRaw("$CAL?");
    };
    setTimeout(firstpoll, 250);
  },
  
  ondisconnect: function(reason)
  {
    connecting = false;
    
    var details = "";
    if (reason)
    {
      details += ": " + JSON.stringify(reason);
    }
    app.disable(connectIcon);
    app.disable(disconnectBtn);
    app.enable(connectButton);
    app.setStatus("Disconnected" + details);
    
    setTimeout(app.list, 2000);
    
    try{ mainValue(); } catch(e) {}
    try{ valuesConfig(); } catch(e) {}
    try{ valuesAngles(); } catch(e) {}
    try{ calibrationMax(); } catch(e) {}
    try{ calibrationStatus(); } catch(e) {}
  },
  
  //var subscribers = [],
  
  subscribe: function(message)
  {
  
  },
  
  onmessage: function(message)
  {
    var dump = false;
    
    var success = function ()
    {
    };
    var failed = function ()
    {
      app.setStatus("sendDataRaw failed");
    };

    var args = message.split("=");
    args[1] = args[1].replace(/(\r\n|\n|\r)/gm,"");
    args = args[1].split(",");
    
    if(message.indexOf("@ERR") != -1)
    {
      app.setStatus("Error: " + args[1] + " (" + args[0] + ")");
    }
    else if(message.indexOf("@SEQ") != -1)
    {
      var num = message.match(/\d+/)[0];
      var text = "$SEQ=" + num + "\n";
      bluetoothSerial.write(text);
    }    
    else if(message.indexOf("@WGT") != -1)
    {
      //dump = true;
      mainValue(args);
    }
    else if(message.indexOf("@CFG") != -1)
    {
      valuesConfig(args);
    }
    else if(message.indexOf("@ANG") != -1)
    {
      valuesAngles(args);
    }
    else if(message.indexOf("@MAX") != -1)
    {
      dump = true;
      calibrationMax(args);
    }
    else if(message.indexOf("@CAL") != -1)
    {
      dump = true;
      calibrationStatus(args);
    }    
    else
      dump = true;
    
    if(debugmessages && dump)
    {
      debugmessages.value += message;
      debugmessages.scrollTop = debugmessages.scrollHeight;
    }
  },
  
  sendDataRaw: function(data)
  {
    if(!deviceReady)
    {
      console.log("sendDataRaw("+ data + ") abort, device not ready");
      return;
    }
    if(suspended)
      return;
    
    try
    {
      var isConnected = function()
      {
        data += "\n";
      
        var success = function ()
        {
          //debugmessages.value += data;
          //debugmessages.scrollTop = debugmessages.scrollHeight;
        };
        var failed = function ()
        {
          app.setStatus("sendDataRaw failed");
          //debugmessages.value += data;
          //debugmessages.scrollTop = debugmessages.scrollHeight;
        };
    
        bluetoothSerial.write(data, success, app.generateFailureFunction("sendDataRaw Failed"));
      };
      
      bluetoothSerial.isConnected(isConnected);
    }
    catch(e)
    {
      app.setStatus("sendRaw failed on " + data);
    }
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
