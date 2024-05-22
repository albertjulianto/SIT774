let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('wonderlustDB');

db.serialize(function(){
    db.run('CREATE TABLE IF NOT EXISTS Comments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, rating INTEGER, feedback TEXT)');
    db.run('DELETE FROM Comments');
    db.run('CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)');
    db.run('DELETE FROM Users');
}); 