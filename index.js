const Axios = require('axios');
const _ = require('lodash');

function parseContacts(data) {
  let parsedData = {};
  let contactsJSON = [];
  let links = [];

  // Extract contacts JSON
  if (data && data.entry) {
    contactsJSON = [data.entry];
  } else if (data && data.feed && data.feed.entry) {
    contactsJSON = data.feed.entry;
  }

  // Extract links
  if (data && data.feed && data.feed.link) {
    links = data.feed.link;
  }

  parsedData.contacts = parseContactEntries(contactsJSON);
  parsedData.next = parseNextLink(links);

  return parsedData;
}

function parseContactEntries(contactsJSON) {
  let contacts = [];

  if (!contactsJSON) {
    return contacts;
  }
  contactsJSON.forEach(contactJSON => {
    let contactURI = _.get(contactJSON, 'id.$t', '');
    let contactTypeRel = _.get(contactJSON, 'gd$email.0.rel', '');
    let contact = {
      name: _.get(contactJSON, 'title.$t', ''),
      email: _.get(contactJSON, 'gd$email.0.address', ''),
      contact_type: contactTypeRel.substring(
        contactTypeRel.lastIndexOf('#') + 1,
      ),
      id: contactURI.substring(contactURI.lastIndexOf('/') + 1),
      phoneNumber: _.get(contactJSON, 'gd$phoneNumber.0.$t', ''),
      etag: _.get(contactJSON, 'gd$etag', ''),
      display_name: _.get(contactJSON, 'gd$email.0.displayName', ''),
      shortmetadata: {
        id: contactURI.substring(contactURI.lastIndexOf('/') + 1),
        name: contactJSON['gd$name'],
        email: contactJSON['gd$email'],
        phoneNumber: contactJSON['gd$phoneNumber'],
      },
      fullmetadata: contactJSON,
    };
    contacts.push(contact);
  });

  return contacts;
}

function parseNextLink(links) {
  let nextLink = null;

  if (_.isEmpty(links)) {
    return nextLink;
  }

  links.forEach(link => {
    if (link.rel !== 'next') {
      return;
    }

    nextLink = link.href;
  });

  return nextLink;
}

async function getAllContacts(access_token) {
  let url = `https://www.google.com/m8/feeds/contacts/default/full?access_token=${access_token}&alt=json`;
  let allContacts = [];

  const headers = {
    'GData-Version': '3.0',
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/534.30 (KHTML, like Gecko) Ubuntu/11.04 Chromium/12.0.742.112 Chrome/12.0.742.112 Safari/534.30',
  };

  while (url) {
    try {
      const res = await Axios.get(url, {headers});
      const data = res.data;
      const parsedRes = parseContacts(data);
      const contacts = parsedRes['contacts'];
      allContacts = allContacts.concat(contacts);
      next = parsedRes['next'];

      if (next) {
        url = next + `&access_token=${access_token}`;
      } else {
        url = null;
      }
    } catch (err) {
      console.log(err);
    }
  }

  return allContacts;
}

exports.handler = async event => {
  const accessToken = event['queryStringParameters']['access_token'];
  const contacts = await getAllContacts(accessToken);
  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: {},
    body: JSON.stringify({contacts}),
  };
};
