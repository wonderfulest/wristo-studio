---
trigger: model_decision
description: 
globs: 
---
### studio平台 同步 到 wpay 产品

POST {{baseUrl}}/api/products/create-from-studio
Content-Type: application/json
Authorization: Bearer {{api_token}}

{
  "name": "产品1",
  "description": "这是一个测试产品1",
  "trialLasts": 0.25,
  "price": 1.99,
  "designId": "uivuzfaakyuw090li6oudxex"
}

返回值：
{
  "code": 0,
  "msg": "success",
  "data": {
    "appId": 151745,
    "designId": "uivuzfaakyuw090li6oudxex",
    "name": "产品1",
    "description": "这是一个测试产品1",
    "price": 1.99,
    "garminImageUrl": "",
    "garminStoreUrl": "",
    "trialLasts": 0.25,
    "createdAt": "2025-06-01T04:38:24.755+00:00",
    "updatedAt": "2025-06-01T04:38:24.755+00:00",
    "isDeleted": 0
  }
}