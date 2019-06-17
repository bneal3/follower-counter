/*jshint esversion: 6 */

// ***********
// Variables
// ***********
var _ = require('lodash');
const got = require('got');
var fs = require('fs');

var globals = require('./globals');

const csvtojson = require('csvtojson');
const Horseman = require('node-horseman');

var socialblade = require('socialblade-data');

// ***********
// Processes
// ***********
// LOADING
return csvtojson().fromFile('./server/io/influencerlist.csv').then((results)=>{
  console.log(results);
  results.forEach((result) => {
		result.metrics = {
      youtube: -1,
      facebook: -1,
      instagram: -1,
      twitter: -1,
      totalviews: -1,
      lastmonthviews: -1
    };
	});
  return results;
}).then((influencers) => {
  var promises = [];

  influencers.forEach((influencer) => {
    // YOUTUBE
    var youtube = got('https://www.googleapis.com/youtube/v3/channels?part=statistics&id=' + influencer.Youtube + '&key=' + process.env.GOOGLE_ACCESS_TOKEN, { json: true }).then((response) => {
      console.log('YOUTUBE');
      console.log(response.body);
      console.log(response.body.items[0].statistics);
      influencer.metrics.youtube = response.body.items[0].statistics.subscriberCount;
      influencer.metrics.totalviews = response.body.items[0].statistics.viewCount;
      return response.body;
    }).catch((error) => {
      console.log(error);
    });
    promises.push(youtube);

    // FACEBOOK
    var facebook = scrape('https://www.facebook.com/' + influencer.Facebook, '.clearfix > ._4bl9 > div').then((result) => {
      console.log('FACEBOOK');
      console.log(result);
      var refined = result.split(' ');
      console.log(refined[0]);
      influencer.metrics.facebook = refined[0];
      return result;
    }).catch((error) => {
      console.log(error);
    });
    promises.push(runningviews);

    // INSTAGRAM
    var instagram = got('https://www.instagram.com/' + influencer.Instagram + '/?__a=1', { json: true }).then((response) => {
      console.log('INSTAGRAM');
      console.log(response.body);
      console.log(response.body.graphql.user.edge_followed_by.count);
      influencer.metrics.instagram = response.body.graphql.user.edge_followed_by.count;
      return response.body;
    }).catch((error) => {
      console.log(error);
    });
    promises.push(instagram);

    // TWITTER
    var twitter = got('https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=' + influencer.Twitter, { json: true }).then((response) => {
      console.log('TWITTER');
      console.log(response.body);
      console.log(response.body[0].followers_count);
      influencer.metrics.twitter = response.body[0].followers_count;
      return response.body;
    }).catch((error) => {
      console.log(error);
    });
    promises.push(twitter);

    // SOCIAL BLADE
    var runningviews = scrape('https://socialblade.com/youtube/user/' + influencer.Socialblade, '#afd-header-views-30d').then((result) => {
      console.log('SOCIALBLADE');
      result = result.replace(/\s+/g, '');
      console.log(result);
      influencer.metrics.lastmonthviews = result;
      return result;
    }).catch((error) => {
      console.log(error);
    });
    promises.push(runningviews);

    // got('https://socialblade.com/youtube/user/' + influencer.Socialblade, { json: true }).then((response) => {
    //   console.log('TWITTER');
    //   console.log(response.body);
    //   console.log(response.body);
    //
    //   return response.body;
    // }).catch((error) => {
    //   console.log(error);
    // });
    // promises.push(runningviews);
    // var runningviews = new Promise((resolve, reject) => {
    //   socialblade.loadChannelData(influencer.Socialblade, function(err, data) {
    //     if(err) {
    //       console.log(err);
    //       reject(err);
    //     } else {
    //       console.log('SOCIALBLADE');
    //       console.log(data);
    //       //influencer.metrics.lastmonthviews = data;
    //       resolve(data);
    //     }
    //   });
    // });
    // promises.push(runningviews);
  });

  // EXPORT
  Promise.all(promises).then(() => {
    var path = './server/io/influencermetrics.txt';
    var writeStream = fs.createWriteStream(path, {'flags': 'w'});
    writeStream.write('Influencer: Youtube Subscribers, Facebook Page Likes, Instagram Followers, Twitter Followers, Total Youtube Views, Youtube Views Past 30 days\n');

    influencers.forEach((influencer) => {
      writeStream.write(influencer.Influencer + ': ' + influencer.metrics.youtube + ', ' + influencer.metrics.facebook + ', ' + influencer.metrics.instagram + ', ' + influencer.metrics.twitter + ', ' + influencer.metrics.totalviews + ', ' + influencer.metrics.lastmonthviews + ', ' + '\n');
    });
  });
}).catch((e) => {
  console.log(e);
});

function scrape(url, selector) {
  var horseman = new Horseman();

  return horseman
		.userAgent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0')
	 	.open(url)
  	.waitForSelector(selector)
  	.catch(function(error){
  		console.log(error);
  	})
  	.text(selector)
  	.log()
  	.then((text) => {
      return text;
	  })
		.close();
}
