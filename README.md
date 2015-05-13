# redis-online

Node redis online/offline tracker.
Using this approach - [link](http://www.lukemelia.com/blog/archives/2010/01/17/redis-in-practice-whos-online/)

## Usage

First install

```bash
npm install redis-online
```

```js
var options = {
  redisUrl: 'redis://0@localhost:6379'
};

var tracker = require('redis-online')(options);`

// ...

// periodically (once per minute) call the route for every online user
// from the browser f. e.

router.post('/api/online', function(req, res){

  // get userId from session
  
  tracker.setOnline(userId);
  
  res.json(true);
});


// get list of online users
router.get('/api/online', function(req, res){

  tracker.getOnline(function(err, userIds){
    res.json(userIds);
  });
  
});

```

