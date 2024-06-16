const express=require('express')
const app=express()
const QRCode = require('qrcode')
const bodyParser=require('body-parser')
const path=require('path')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const session=require('express-session')
const mongodb=require('mongodb');
require('dotenv').config();
const {MongoClient}=require('mongodb')
const uri = process.env.uri;
const NodeCache = require('node-cache');
const cache = new NodeCache();
const jwt = require('jsonwebtoken');
const secretKey = 'YourSecretKey';
const port=process.env.PORT || 3000
const nodemailer=require('nodemailer');
const fs=require('fs')



app.use(express.static(__dirname));


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

function encryptData(data) {
  const encryptedData = jwt.sign(data, secretKey);
  return encryptedData;
}


function decryptData(encryptedData) {
  const decryptedData = jwt.verify(encryptedData, secretKey);
  return decryptedData;
}


function mail(reason,details){
  console.log("r:"+reason)
  console.log(details)
  const transporter = nodemailer.createTransport({
    service : 'Gmail',
    auth : {
      user : 'gitamlibproj@gmail.com',
      pass : 'xhes gdvu rkfh lbln'
    }
  });
  if(reason=="borrowed"){
  const htmlTemplate=fs.readFileSync('mail.html','utf8');
  const givenDateStr = details["Borrowed"];
  const [day, month, year] = givenDateStr.split('/');
  const givenDate = new Date(`${year}-${month}-${day}`);
  givenDate.setDate(givenDate.getDate() + 10);

// Get the new date components
  const newDay = givenDate.getDate();
  const newMonth = givenDate.getMonth() + 1; 
  const newYear = givenDate.getFullYear();

// Format the new date as string
const renew_Date = `${newDay}/${newMonth}/${newYear}`;
  const dynamicData={
    bookid:details['Bookid'],
    bookname:details['BookName'],
    Student:details['Name'],
    issued_date:details["Borrowed"],
    renew_date: renew_Date
  }
  const emailBody = htmlTemplate.replace(/\$\{(\w+)\}/g, (_, key) => dynamicData[key]);
        const mail_option = {
          from : 'gitamlibproj@gmail.com            ' ,
          to : details['Email'],
          subject: 'Cofiramation mail from GLMS',
          html: emailBody
        };
  

  transporter.sendMail(mail_option, (error, info) => {
    if(error)
    {
      console.log(error);
    }
  });
  return "success"
}
else{
  const htmlTemplate=fs.readFileSync('mail1.html','utf8');
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();

  
  const dynamicData={
    bookid:details['Bookid'],
    bookname:details['BookName'],
    Student:details['Name'],
    issued_date:details["Borrowed"],
    return_date:`${currday}/${currmonth}/${curryear}`

  }
  const emailBody = htmlTemplate.replace(/\$\{(\w+)\}/g, (_, key) => dynamicData[key]);
        const mail_option = {
          from : 'gitamlibproj@gmail.com            ' ,
          to : details['Email'],
          subject: 'Cofiramation mail from GLMS',
          html: emailBody
        };
  

  transporter.sendMail(mail_option, (error, info) => {
    if(error)
    {
      console.log(error);
    }
  });
  return "success"

}

}




client.connect((err) => {
  if (err) {
    console.log(err)
  }
  console.log('Connected to MongoDB Atlas');
  db = client.db('gitamlibproject').collection('project-phase2')
});


app.use(session({
    secret: 'hellllloooo',
    resave: false,
    saveUninitialized: false
  }));
  
  // Initialize Passport.js
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(bodyParser.json({limit:'130mb'}))
  app.use(bodyParser.urlencoded({limit:'130mb',extended:true}))
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.clientID,
        clientSecret: process.env.clientSecret,
        callbackURL: process.env.callbackURL
      },
      (accessToken, refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );
  
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  
  passport.deserializeUser((user, done) => {
    done(null, user);
  });

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    async(req, res) => {
        if(req['user']['_json']['hd']=='gitam.in' && req['user']['_json']['email']!='schitloo@gitam.in'){
            res.sendFile(path.join(__dirname,'/studentinterface.html'));
        }else if(req['user']['_json']['email']=='schitloo@gitam.in' && req['user']['_json']['hd']=='gitam.in'){
            res.redirect('/approve')
        }else{
            res.send("Invalid user")
        }

    })

app.get('/',(req,res)=>{
res.sendFile(path.join(__dirname,'index.html'))
})

app.post('/signin',(req,res)=>{
    res.redirect('/auth/google')
})
//sath
app.post('/qr',async(req,res)=>{
  const book = JSON.parse(req.body["decodetext"]);
// Remove leading and trailing whitespace and then split on \

const bookname = book['Bookname'];
const bookid = book['Bookid'];

const name=req['user']['_json']['given_name'];
const roll=req['user']['_json']['family_name']
const email=req['user']['_json']['email']
const doc=await db.findOne({Name:name,Rollno:roll,Email:email});
if(!doc){
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();

  const book={
    Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    Book0:{BookName:bookname,
          Bookid:bookid,
          status:'pending',
          Borrowed:`${currday}/${currmonth}/${curryear}`
    }
  }


  await db.insertOne(book);
  const lib=await db.findOne({Role:'librarian'})

  if(Object.keys(lib['pending']).length===0){
    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:bookname,
    Bookid:bookid,
    status:'pending',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

  const update = { $set: { 'pending.Book0': student } }
      await db.updateOne({Role:'librarian'}, update);
  }
  else{

    const len = Object.keys(lib.pending);
      const last = len[len.length - 1];
      const match = last.match(/\d+/);
      const number = parseInt(match[0]) + 1;
      const b = "pending.Book" + number;

      const student={ Name:req['user']['_json']['given_name'],
      Rollno:req['user']['_json']['family_name'],
      Email:req['user']['_json']['email'],
      BookName:bookname,
      Bookid:bookid,
      status:'pending',
      Borrowed:`${currday}/${currmonth}/${curryear}`}
  
      const update = {
        $set: {}
    };
    update.$set[b] = student;
    
    await db.updateOne({ Role: 'librarian' }, update);
  }

}
else{
  console.log("user exists")
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();

  const len = Object.keys(doc);
  const last = len[len.length - 1];
  const match = last.match(/\d+/);
  const number = parseInt(match[0]) + 1;
  const b = "Book" + number;

  const bookKeys = Object.keys(doc).filter(key => key.startsWith('Book'));
  var bookids=[];
  bookKeys.forEach(bookKey => {
    const subElement = doc[bookKey];
    if (subElement && subElement.Bookid && doc[bookKey]['Returned']==undefined) {
      bookids.push(subElement.Bookid);

    }
  });
  if (bookids.includes(bookid) ) {
    res.sendFile(__dirname+"/alreadyborrowed.html")
    console.log(`${bookid} is already present in bookids list`);
} else {
  const book={BookName:bookname,
    Bookid:bookid,
    status:'pending',
    Borrowed:`${currday}/${currmonth}/${curryear}`
  }
  const update = {
    $set: {}
};
update.$set[b] = book;
await db.updateOne(doc, update);
const lib=await db.findOne({Role:'librarian'})
if(Object.keys(lib['pending']).length===0){
  const student={ Name:req['user']['_json']['given_name'],
  Rollno:req['user']['_json']['family_name'],
  Email:req['user']['_json']['email'],
  BookName:bookname,
  Bookid:bookid,
  status:'pending',
  Borrowed:`${currday}/${currmonth}/${curryear}`}

const update = { $set: { 'pending.Book0': student } }
    await db.updateOne({Role:'librarian'}, update);
}
else{
  const len = Object.keys(lib.pending);
    const last = len[len.length - 1];
    const match = last.match(/\d+/);
    const number = parseInt(match[0]) + 1;
    const b = "pending.Book" + number;

    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:bookname,
    Bookid:bookid,
    status:'pending',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

    const update = {
      $set: {}
  };
  update.$set[b] = student;
  
  await db.updateOne({ Role: 'librarian' }, update);
}
}
}
})

app.post('/qrgenerating',(req,res)=>{
  res.sendFile(path.join(__dirname+'/qrgenerating.html'))
})






app.get('/approve',async(req,res)=>{
  const doc=await db.findOne({Role:"librarian"})
  var html=`<!DOCTYPE html>
  <html lang="en">
  
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Book details</title>
  
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css?family=Varela+Round" rel="stylesheet">
    <style>
      body {
      display: flex;
      justify-content: center;
      align-items: center;
      padding-top: 40px;
      background-color: #f4f4f4;
  }
  #history{
    color: #fff;
  cursor: pointer;
  height: 50px;
  font-size: 17px;
  border-radius: 5px;
  background: #981f2b;
  margin-top: 20px; /* Added margin */
  margin-left: 10%;
  display: block; /* Changed display to block */
  text-align: center;
  width:100%; /* Centered text */
  align-items: center;
  }
  .styled-table {
      border-collapse: collapse;
      margin: 25px 0;
      font-size: 0.9em;
      font-family: sans-serif;
      min-width: 250px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      border-radius: 7px;
  }
  
  .styled-table thead tr {
      background-color:#981f2b;
      color: #ffffff;
      text-align: left;
  }
  .top{
    position: absolute;
    top: 0;
    left: 80%;
  }
  
  .styled-table th,
  .styled-table td {
      padding: 15px 20px;
  }
  
  .styled-table tbody tr {
      border-bottom: 1px solid #dddddd;
  }
  
  .styled-table tbody tr:nth-of-type(even) {
      background-color: #ffffff;
  }
  
  .styled-table tbody tr:last-of-type {
      border-bottom: 2px solid #b33a2f;
  }
  
  .styled-table tbody tr.active-row {
      color: #090c0c;
  }
  
  /* Media queries for responsive design */
  
  @media only screen and (max-width: 768px) {
      .styled-table {
          font-size: 0.8em;
      }
  
      .styled-table th,
      .styled-table td {
          padding: 10px 15px;
      }
  }
  
  @media only screen and (max-width: 480px) {
      .styled-table {
          font-size: 0.7em;
      }
  
      .styled-table th,
      .styled-table td {
          padding: 8px 12px;
      }
  }
  
      .tick-button,
  
      .cross-button {
        background-color: #f44336; /* Red background color for cross button */
      }
      .reject {
        display: flex;
        height: 3em;
        width: 100px;
        align-items: center;
        justify-content: center;
        background-color: #eeeeee4b;
        border-radius: 3px;
        letter-spacing: 1px;
        transition: all 0.2s linear;
        cursor: pointer;
        border: none;
        background: #c0321c;
       }
       .accept{
        display: flex;
        height: 3em;
        width: 100px;
        align-items: center;
        justify-content: center;
        background-color: #eeeeee4b;
        border-radius: 3px;
        letter-spacing: 1px;
        transition: all 0.2s linear;
        cursor: pointer;
        border: none;
        background:#67e12f;
       }
       
       
       
      
       
       button:hover {
        box-shadow: 9px 9px 33px #d1d1d1, -9px -9px 33px #ffffff;
        transform: translateY(-2px);
       }
    </style>
  </head>
  
  <body>
    <table class="styled-table">
      <thead>
      <tr>
      <th>Rollno</th>
      <th>Name</th>
      <th>Book Name</th>
      <th>Book Id</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>

  `
  const pending=doc['pending'];

  for (let key in pending) {
      const value = pending[key];
      if(value['status']=='pending for return'){
        html+=` <tr>
        <form action="/reqforret" method="post">
        <td>${value['Rollno']}</td>
        <td>${value['Name']}</td>
        <td>${value['BookName']}</td>
        <td>${value['Bookid']}</td>
        <td>
        <div style="display:flex;gap:10px;">
        <input type="hidden" value="${key}" name="bookid">
        <button type="submit" class="accept">
        <span>Accept</span>
      </button>
        </form>
        <form action="/rejected" method="post">
      <input type="hidden" value="${key}" name="bookid">
      <button type="submit" class="reject">
      <span>Reject</span>
            </form>
      </div>
        </td>

      </tr>`
      }
      else{
      html+=` <tr>
      <form action="/approved" method="post">
      <td>${value['Rollno']}</td>
      <td>${value['Name']}</td>
      <td>${value['BookName']}</td>
      <td>${value['Bookid']}</td>
      <td>
      <div style="display:flex;gap:10px">
      <input type="hidden" value="${key}" name="bookid">
      <button type="submit" class="accept">
        <span>Accept</span>
      </form>
      <form action="/rejected" method="post">
      <input type="hidden" value="${key}" name="bookid">
      <button type="submit" class="reject">
        <span>Reject</span>
      </form>
      </div>
      </td>

    </tr>`}
      
  }
  html+=`
  </tbody>
  </table>
  <div class="top">
			<form action="/qrgenerating" method="post" >
				<input type="submit" id="history" name="history" value="Generate Qr for books">
			</form>
		</div>
  </body>
  </html>`;
  res.send(html)
})





app.post('/reqforret',async(req,res)=>{
  const doc = await db.findOne({ Role: "librarian" });
  console.log(doc)
const bookid1 = req.body.bookid;
console.log(bookid1);
const b = `pending.${bookid1}`; // Constructing the exact field to u
console.log(b)
var r = doc['pending'][bookid1];
console.log(r)
const unsetObject = {};
unsetObject[b] = '';

const result = await db.updateOne(
    { Role: "librarian" },
    { $unset: unsetObject }
);
const currentDate = new Date();
const curryear = currentDate.getFullYear();
const currmonth = currentDate.getMonth() + 1; 
const currday = currentDate.getDate();
const id=r['Bookid'];
const stu = await db.findOne({ Rollno:r['Rollno'] });
const bookKeys = Object.keys(stu).filter(key => key.startsWith('Book'));

console.log(id);
console.log("break")
bookKeys.forEach(async bookKey => {
  const book=stu[bookKey]['Bookid'];
  console.log(book)
  if(id==book){
    stu[bookKey]['Returned']=`${currday}/${currmonth}/${curryear}`;
    stu[bookKey]['status']="Returned";
    const setObject = {};
    setObject[bookKey] = stu[bookKey];
    const setResult = await db.updateOne(
      { Rollno:  r['Rollno'] },
      { $set: setObject }
  );
  }

})

r['Returned']=`${currday}/${currmonth}/${curryear}`;
r['status']="Returned";
if(Object.keys(doc['Approved']).length===0){
 const setObject = {};
  setObject['Approved.Book0'] = r;

  // Update the document to set the book in approve
  const setResult = await db.updateOne(
      { Role: "librarian" },
      { $set: setObject }
  );

}else{
const len = Object.keys(doc.Approved);
const last = len[len.length - 1];
const match = last.match(/\d+/);
const number = parseInt(match[0]) + 1;
const b = "Approved.Book" + number;

const setObject = {};
setObject[b] = r;

const setResult = await db.updateOne(
    { Role: "librarian" },
    { $set: setObject }
);
}
mail("return",r)
res.redirect('/approve')
})


app.post('/approved',async(req,res)=>{
  const doc = await db.findOne({ Role: "librarian" });
    const appr = req.body.bookid;
    const pendingField = `pending.${appr}`;
    const appbook=doc.pending.appr;
    var ob;
    // Create a dynamic object to specify the field to unset
    const unsetObject = {};
    unsetObject[pendingField] = '';

    const result = await db.updateOne(
        { Role: "librarian" },
        { $unset: unsetObject }
    );

    if(Object.keys(doc['Approved']).length===0){
      ob={
        Name:doc['pending'][appr]['Name'],
        Rollno:doc['pending'][appr]['Rollno'],
        Email:doc['pending'][appr]['Email'],
        BookName:doc['pending'][appr]['BookName'],
        Bookid:doc['pending'][appr]['Bookid'],
        status:'approved',
        Borrowed:doc['pending'][appr]['Borrowed']
      }
      

     const setObject = {};
      setObject['Approved.Book0'] = ob;
  
      // Update the document to set the book in approve
      const setResult = await db.updateOne(
          { Role: "librarian" },
          { $set: setObject }
      );
  
    }else{
    const len = Object.keys(doc.Approved);
    const last = len[len.length - 1];
    const match = last.match(/\d+/);
    const number = parseInt(match[0]) + 1;
    const b = "Approved.Book" + number;
    ob={
      Name:doc['pending'][appr]['Name'],
      Rollno:doc['pending'][appr]['Rollno'],
      Email:doc['pending'][appr]['Email'],
      BookName:doc['pending'][appr]['BookName'],
      Bookid:doc['pending'][appr]['Bookid'],
      status:'approved',
      Borrowed:doc['pending'][appr]['Borrowed']
    }
   const setObject = {};
    setObject[b] = ob;

    // Update the document to set the book in approve
    const setResult = await db.updateOne(
        { Role: "librarian" },
        { $set: setObject }
    );

    }
    const rollno=doc['pending'][appr]['Rollno'];
    const user=await db.findOne({Rollno:rollno});
    const bookid=doc['pending'][appr]['Bookid'];
    const bookKeys = Object.keys(user).filter(key => key.startsWith('Book'));
    bookKeys.forEach(async bookKey => {
      const book=user[bookKey]['Bookid'];
      if(bookid==book){
        const updateResult = await db.updateOne(
          { Rollno: rollno, [`${bookKey}.Bookid`]: bookid },
          { $set: { [`${bookKey}.status`]: 'approved' } }
      );
      }
   })
   mail("borrowed",ob);
   res.redirect('/approve')
  }
)

app.post('/rejected',async(req,res)=>{
 
  const doc=await db.findOne({Role:"librarian"})
  const key=req.body.bookid;
  
  const bookid=doc['pending'][key];
 
  const unsetObject = {};
  const Bookid=bookid['Bookid'];
  const rollno=bookid['Rollno'];
  
  const b=`pending.${key}`
unsetObject[b] = '';
const result = await db.updateOne(
    { Role: "librarian" },
    { $unset: unsetObject }
);
const stu = await db.findOne({'Rollno':rollno});
const bookKeys = Object.keys(stu).filter(key => key.startsWith('Book'));
bookKeys.forEach(async bookKey => {
 
  const r=stu[bookKey]['Bookid']
  console.log(bookid["Bookid"]);
  if(bookid["Bookid"]==r){
    stu[bookKey]['status']="Rejected";
    const setObject = {};
    setObject[bookKey] = stu[bookKey];
    const setResult = await db.updateOne(
      { Rollno: rollno },
      { $set: setObject }
  );
  }
})

res.redirect('/approve')
})

app.post('/history', async (req, res) => {
  try {
      const rollno = req.user._json.family_name;
      const doc = await db.findOne({ Rollno: rollno });
      var html = `<!DOCTYPE html>
      <html lang="en">
      
      <head>
          <!-- Required meta tags -->
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Book details</title>
      
          <link rel="stylesheet" href="details.css">
          <link href="https://fonts.googleapis.com/css?family=Varela+Round" rel="stylesheet">
          <style>
              body {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  margin: 0;
                  background-color: #f4f4f4;
                  padding: 20px; /* Adjust padding as needed */
              }
              
              h1 {
                  margin-top: 10px; /* Adjust margin as needed */
                  margin-bottom: 10px;
              }
              
              .styled-table {
                  border-collapse: collapse;
                  margin: 15px 0;
                  font-size: 1em;
                  font-family: sans-serif;
                  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
                  border-radius: 7px;
                  min-width: 100%; /* Remove horizontal scrolling for small screens */
              }
              
              .styled-table thead tr {
                  background-color: #b33a2f;
                  color: #ffffff;
                  text-align: left;
              }
              
              .styled-table th,
              .styled-table td {
                  padding: 10px 15px;
              }
              
              .styled-table tbody tr {
                  border-bottom: 1px solid #dddddd;
              }
              
              .styled-table tbody tr:nth-of-type(even) {
                  background-color: #d3d3d3;
              }
              
              .styled-table tbody tr:last-of-type {
                  border-bottom: 2px solid #b33a2f;
              }
              
              .styled-table tbody tr.active-row {
                  color: #090c0c;
              }
              
              .styled-table button {
                  padding: 8px;
                  margin: 4px;
              }
              
              /* Media queries for responsive design */
              
              @media only screen and (max-width: 768px) {
                  .styled-table {
                      font-size: 0.9em;
                  }
              
                  .styled-table th,
                  .styled-table td {
                      padding: 8px 12px;
                  }
              }
              
              @media only screen and (max-width: 48px) {
                  .styled-table {
                      font-size: 0.8em;
                  }
              
                  .styled-table th,
                  .styled-table td {
                      padding: 6px 10px;
                  }
              }
              .renew{
                display: flex;
        height: 3em;
        width: 100px;
        align-items: center;
        justify-content: center;
        background-color: #eeeeee4b;
        border-radius: 3px;
        letter-spacing: 1px;
        transition: all 0.2s linear;
        cursor: pointer;
        border: none;
        background:#981f2b;
              }
          </style>
      </head>
      
      <body>
          <center>
              <h1>Book Yet To Approve</h1>
          </center>
          <table class="styled-table">
              <thead>
                  <tr>
                      <th>Book Name</th>
                      <th>Book Id</th>
                  </tr>
              </thead>
              <tbody>`;

      const bookKeys = Object.keys(doc).filter(key => key.startsWith('Book'));
      const bookPromises = bookKeys.map(async bookKey => {
          let rowHtml = '';
          if (doc[bookKey]['status'] == 'pending') {
              rowHtml = `<tr>
                  <td>${doc[bookKey]['BookName']}</td>
                  <td>${doc[bookKey]['Bookid']}</td>
              </tr>`;
          }
          return rowHtml;
      });

      const bookRows = await Promise.all(bookPromises);

      bookRows.forEach(row => {
          html += row;
      });

      html += `</tbody>
          </table>
          <h1>Books Approved</h1>
          <table class="styled-table">
              <thead>
                  <tr>
                      <th>Book Name</th>
                      <th>Book Id</th>
                      <th>Status</th>
                  </tr>
              </thead>
              <tbody>`;

      const currentDate = new Date();
      const bookPromises2 = bookKeys.map(async bookKey => {
          let rowHtml = '';
          if (doc[bookKey]['status'] == 'approved') {
              const borrow = doc[bookKey]['Borrowed'];
              const parts = borrow.split('/');
              const givenDate = new Date(parts[2], parts[1] - 1, parts[0]);
              const differenceInDays = Math.floor((currentDate - givenDate) / (1000 * 60 * 60 * 24));
              if (differenceInDays == 0 || differenceInDays == 11) {
                  rowHtml = `<tr class="active-row">
                      <td>${doc[bookKey]['BookName']}</td>
                      <td>${doc[bookKey]['Bookid']}</td>
                     
                      <td>
                      <div style="display:flex;">
                          <form action="/renew" method="post" style="display: inline;">
                              <input type="hidden" value="${bookKey}" name="bookid">
                              <button type="submit"  class="renew">Renew</button>
                          </form>
                         
                          <form action="/return" method="post" style="display: inline;">
                              <input type="hidden" value="${bookKey}" name="bookid">
                              <button type="submit"  class="renew">Return</button>
                          </form>
                          </div>
                      </td>
                      
                  </tr>`;
              } else if (differenceInDays > 12) {
                  const fine = differenceInDays * 100;
                  rowHtml = `<tr>
                      <td>${doc[bookKey]['BookName']}</td>
                      <td>${doc[bookKey]['Bookid']}</td>
                      <td>fine: ${fine}</td>
                  </tr>`;
              } else if (differenceInDays < 10) {
                  rowHtml = `<tr>
                      <td>${doc[bookKey]['BookName']}</td>
                      <td>${doc[bookKey]['Bookid']}</td>
                      <td>Approved</td>
                  </tr>`;
              }
          }
          return rowHtml;
      });

      const bookRows2 = await Promise.all(bookPromises2);

      bookRows2.forEach(row => {
          html += row;
      });

      html += `</tbody>
          </table>
      </body>
      </html>`;

      res.send(html);
  } catch (err) {
      res.sendFile(path.join(__dirname, '/colorlib-error-404-14/index.html'));
  }
});

app.post('/renew',async(req,res)=>{
  const bookid=req.body.bookid;
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();
  const doc=await db.findOne({Rollno:req.user._json.family_name})
  const k=doc[bookid]
  const k1={
    BookName:k['BookName'],
    Bookid:k['Bookid'],
    status:'pending for renew',
    Borrowed:`${currday}/${currmonth}/${curryear}`
  }
  const update = {
    $set: {}
};
update.$set[bookid] = k1;
await db.updateOne({Rollno:req.user._json.family_name}, update);
const lib=await db.findOne({Role:'librarian'})
const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:k['BookName'],
    Bookid:k['Bookid'],
    status:'pending for renew',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

    const pendingList = lib.pending|| {};
    // Use Object.keys to get an array of keys (book identifiers)
    const bookKeys = Object.keys(pendingList);
    
    // Check if the student is already in the pending list for any book
    const isStudentInPendingList = bookKeys.some(bookKey => {
        const book = pendingList[bookKey];
        return book.Bookid === student.Bookid && book.Rollno === student.Rollno;
    });
if(!isStudentInPendingList){
  if(Object.keys(lib['pending']).length===0){
    //console.log("0 books in pending list with new user")
    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:k['BookName'],
    Bookid:k['Bookid'],
    status:'pending for renew',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

  const update = { $set: { 'pending.Book0': student } }
      await db.updateOne({Role:'librarian'}, update);
  }
  else{

    const len = Object.keys(lib.pending);
      const last = len[len.length - 1];
      const match = last.match(/\d+/);
      const number = parseInt(match[0]) + 1;
      const b = "pending.Book" + number;

      const student={ Name:req['user']['_json']['given_name'],
      Rollno:req['user']['_json']['family_name'],
      Email:req['user']['_json']['email'],
      BookName:k['BookName'],
      Bookid:k['Bookid'],
      status:'pending for renew',
      Borrowed:`${currday}/${currmonth}/${curryear}`}
  
      const update = {
        $set: {}
    };
    update.$set[b] = student;
    
    await db.updateOne({ Role: 'librarian' }, update);
  }
}
else{
  res.sendFile(__dirname+"/alreadyrequested.html")
}
  

})

app.post('/return',async(req,res)=>{
  const bookid=req.body.bookid;
  const doc=await db.findOne({Rollno:req.user._json.family_name})
  doc[bookid]['status']='pending for return';


  const update = {
    $set: {}
};

update.$set[bookid] =doc[bookid] ;

await db.updateOne({Rollno:doc["Rollno"]}, update);

const lib=await db.findOne({Role:'librarian'})
if(Object.keys(lib['pending']).length===0){
  const student={ Name:req['user']['_json']['given_name'],
  Rollno:req['user']['_json']['family_name'],
  Email:req['user']['_json']['email'],
  BookName:doc[bookid]['BookName'],
  Bookid:doc[bookid]['Bookid'],
  status:'pending for return',
  Borrowed:doc[bookid]['Borrowed']}

const update = { $set: { 'pending.Book0': student } }
    await db.updateOne({Role:'librarian'}, update);
}
else{

  const len = Object.keys(lib.pending);
    const last = len[len.length - 1];
    const match = last.match(/\d+/);
    const number = parseInt(match[0]) + 1;
    const b = "pending.Book" + number;

    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:doc[bookid]['BookName'],
    Bookid:doc[bookid]['Bookid'],
    status:'pending for return',
    Borrowed:doc[bookid]['Borrowed']
  }

    const update = {
      $set: {}
  };
  update.$set[b] = student;
  await db.updateOne({ Role: 'librarian' }, update)
}


})
app.listen(port,()=>{
console.log("Listening to port 3001!");
})