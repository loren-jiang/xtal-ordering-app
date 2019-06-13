function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Custom functions')
      .addItem('Send pick up emails', 'menuItem1')
      .addSeparator()
      .addItem('Generate SKUs', 'menuItem2')
      .addToUi();
  
  // Go to last row in orders sheet
  var ordersSht = SpreadsheetApp.getActive().getSheetByName("orders");  
  var lastRow1 = ordersSht.getLastRow();
  var range1 = ordersSht.getRange("A" + lastRow1 + ":A" + lastRow1);
  ordersSht.setActiveRange(range1);
  
}

function menuItem1() {
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
     sendPickUpEmail();
}

function menuItem2() {
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
     generateSKU();
}

function updateAmtBySKU(sku,qty) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('inventory');
  var range = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn());
  var values = range.getValues();
  var skuIdx = 2;
  for (var m = 1; m < values.length; m++) {
         
    rowData = values[m];
    if (rowData[skuIdx] == sku) {
      idx = values[0].indexOf('Amt in stock'); //0-indexed
      range.getCell(m+1,idx+1).setValue(rowData[idx] - qty);
      break;
    }
  }
  
}

//sends email to users to tell them order is ready for pick up in S127
function sendPickUpEmail() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('completedOrders');
  var range = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn());
  var values = range.getValues();
  var dictToBeEmailed = {};
  for (var k = 1; k < values.length; k++) {
    rowData = values[k];
    timeStamp = rowData[2].toString();
    pickupEmailSent = rowData[11];
    
    if (!(pickupEmailSent)) { 
      range.getCell(k+1, 12).setValue(1); //set 'Order pick up email sent' to 1
      if (!(dictToBeEmailed.hasOwnProperty(timeStamp))) { // collects the orders whose pickupEmails have not been sent
        dictToBeEmailed[timeStamp] = [rowData];
      }
      else {
        dictToBeEmailed[timeStamp].push(rowData);
      }
      
    }
    
  }
  
  
  var email,qty,sku,name;
  var date = new Date();
  var time = date.getTime();
  date = date.toLocaleDateString("en-US");
  var subject = 'Screen order ready for pick up | ' + date;
  
  for (var i in dictToBeEmailed) {
    var msg = 'Your orders are ready for pick up in S127: \n \n';
    if (dictToBeEmailed.hasOwnProperty(i)) {
      // do stuff
      var ordersLst = dictToBeEmailed[i];
      
      for (var k = 0; k <ordersLst.length; k++) {
        order = ordersLst[k];
        name = order[6];
        email = order[7] //should be idx 7;
        sku = order[0];
        qty = order[1];
        msg += sku + ' | Qty ' + qty.toString() + '\n';
        updateAmtBySKU(sku,qty);
      }
    }
    var greeting = 'Hi ' + name + ',\n';
    MailApp.sendEmail(email +',' + 'xray@msg.ucsf.edu','xray@msg.ucsf.edu',subject,greeting+msg);
    
}
  
  
}
function getContent(filename) {
    return HtmlService.createTemplateFromFile(filename).getRawContent();
}

function emailOrderConfirmation(to_email, subject, message) {
  MailApp.sendEmail(to_email, subject, '', {
    
    htmlBody: message
  });
}

function getDataBySKU(sku,dataWanted) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('inventory');
  var range = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn());
  var values = range.getValues();
  var data = [];
  var skuIdx = 2;
  for (var m = 1; m < values.length; m++) {
         
    rowData = values[m];
    if (rowData[skuIdx] == sku) {
      for (var k = 0; k <dataWanted.length; k++) {
         
        idx = values[0].indexOf(dataWanted[k]);
        
        data.push(rowData[idx]);
         
      }
      break;
    }
  }
  return data;
}

function processForm(formArr, emailBody) {
  Logger.log(formArr);
  var comments = formArr.filter(function(x) {return x.name=='comment'})[0].value;
  var userName = formArr.filter(function(x) {return x.name=='userName'})[0].value;
  var Email = formArr.filter(function(x){return x.name=='Email'})[0].value;
  var Lab = formArr.filter(function(x){return x.name=='Lab'})[0].value;
  if (Lab == "other") {
    Logger.log("in if");
    Lab = formArr.filter(function(x){return x.name=='other_lab'})[0].value;  
    Logger.log(Lab);
  }
  
  
  function isScreen(thing) {
    return thing.name != 'Lab' && 
      thing.name != 'other_lab' &&
        thing.name != 'userName' && 
          thing.name != 'Email' && 
            thing.value != 0 &&
              thing.name != 'comment';
  }
  
  var ss = SpreadsheetApp.getActive(); //get active spreadsheet
  var sh = ss.getSheetByName('orders');
  var screenArr = formArr.filter(isScreen);
  lastRow = sh.getLastRow();
  var firstRow = ['SKU','Qty','Timestamp','Date','Price','Total price','Name','Email','Lab','Processed','Comments'];
  var headerRange = sh.getRange(1,1,1,firstRow.length);
  for (var i = 0; i < firstRow.length; i++) {
    headerRange.getCell(1,i+1).setValue(firstRow[i]);
  }
  
  var range = sh.getRange(lastRow+1,1,screenArr.length,15);
  var date = new Date();
  var timestamp = date.getTime();
  date = date.toLocaleDateString("en-US");
  
  var rowData;
  for (var j=0; j <screenArr.length; j++) {
    sku = screenArr[j].name;
    qty=screenArr[j].value;
    cost = getDataBySKU(sku, ['Price'])[0]; //get price from inventory sheet, search by sku
    rowData = [sku,qty,timestamp,date,cost,cost*qty,userName,Email,Lab,0,comments];
    for (var k=0;k<rowData.length;k++) {
       range.getCell(j+1,k+1).setValue(rowData[k]);
    }
  
  var subject = 'Screen Order Confirmation | ' + date;
  
  }
  
  emailBody = '<p> Typical turnaround time is 1-2 business days. You will receive an email when order is ready. Please email xray@msg.ucsf.edu if urgent. </p></br> ' 
  +'<p> Please see order summary below: </p> </br>' + emailBody;
  emailOrderConfirmation(Email +',' + 'xray@msg.ucsf.edu',subject,emailBody);
  
}
function setSheetValue(ssName, A1, value){
  var ss = SpreadsheetApp.getActive(); //get active spreadsheet
  var sh = ss.getSheetByName(ssName);
  var range = sh.getRange(ssName + "!" + A1);
  range.setValue(value);
}

//read from inventory with specified A1 notation string
//sh--> sheet, m-->[firstRow,firstCol,lastRow,lastCol]
function readSheetValue(sh,m){
  var range = sh.getRange(m[0],m[1],m[2],m[3]);
  var values = range.getValues();
  return [range, values];
}

function getContent(filename) {
    return HtmlService.createTemplateFromFile(filename).getRawContent();
}

/**
 * Get the URL for the Google Apps Script running as a WebApp.
 */
function getScriptUrl() {
 var url = ScriptApp.getService().getUrl();
 return url;
}

function doGet(e) {
  var ssGroups = SpreadsheetApp.openById('1Yom-H6j04TJ5_W1Ic2dlqKsVWrHQbdInQyq_Q7ZVnZA'); //get spreadsheet of groups
  var shGroups = ssGroups.getSheetByName('Groups');
  var k = [1,1,shGroups.getLastRow(),1];
  var groupOut = readSheetValue(shGroups, k);
  var groupRange = groupOut[0], groupValues = groupOut[1];
  
  var ss = SpreadsheetApp.getActive(); //get active spreadsheet
  var sh = ss.getSheetByName('sortedInventory');
  var sh_completed_orders = ss.getSheetByName('completedOrders');
  
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn(); 
  var m = [1,1,lastRow,lastCol];
  
  var queryString = e.queryString;

  var out = readSheetValue(sh,m);
  var range = out[0], values = out[1];
  var completed_orders = readSheetValue(sh_completed_orders, 
                                        [1,1,sh_completed_orders.getLastRow(), sh_completed_orders.getLastColumn()]
                                       )[1];
  
  var htmlTemplate_order = HtmlService.createTemplateFromFile('order');

  htmlTemplate_order.qsGroupValues = JSON.stringify(groupValues); 
  htmlTemplate_order.qsValues = JSON.stringify(values);
//  htmlTemplate_order.qsCompletedOrders = JSON.stringify(completed_orders);
  if (!e.parameter.page) {
    // When no specific page requested, return "home page"
    return htmlTemplate_order.evaluate();
  }
  else {
    var htmlTemplate =  HtmlService.createTemplateFromFile(e.parameter['page']);
    htmlTemplate.qsCompletedOrders = JSON.stringify(completed_orders);
    return htmlTemplate.evaluate();
  }
}

// Utility function to fetch key values from query string
function getQueryStringValue(query, key){
  var queryParts = query.split("&");
  if(queryParts && queryParts.length > 0){
    for(var i=0; i<queryParts.length; i++){
      var k = queryParts[i].split("=")[0];
      if(k == key) return queryParts[i].split("=")[1];
    }
  }
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function isEmpty(str) {
    return (!str || 0 === str.length);
}

//formats date as ddmmyyyy
function formatDate(date) {
  var dd = date.getUTCDate();
  var mm = date.getUTCMonth() + 1; //January is 0!
  var yyyy = date.getUTCFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  } 
  if (mm < 10) {
    mm = '0' + mm;
  } 
  var formatted = dd + '-' + mm + '-' + yyyy;
  return formatted;
}
//generates a SKU number for new items added to inventory
function generateSKU() {
  var ss = SpreadsheetApp.getActive(); //get active spreadsheet
  var sh = ss.getSheetByName('inventory');
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn(); 
  var m = [2,1,lastRow,lastCol];
  var out = readSheetValue(sh,m);
  var range = out[0], rangeVals = out[1];
//  var range = sh.getRange(2,1,lastRow,lastCol); //skip first row
//  var rangeVals = range.getValues(); //zero indexed....
  
  var item,lot,date,format,sku;
  for ( i = 0; i < lastRow - 1; i++){
    for ( j = 0 ; j < lastCol - 1; j++){
      item = rangeVals[i][0].toString().replaceAll(' ','');
      lot = rangeVals[i][11].toString();
      format = rangeVals[i][4].toString().replaceAll(' ','');
      date = rangeVals[i][10];
      var dateFormatted = formatDate(date);
      sku = item + '_' + format + '-' + lot + '_' + dateFormatted;
      range.getCell(i+1,3).setValue(sku); //remmeber...zero indexed
    }
  }
}

