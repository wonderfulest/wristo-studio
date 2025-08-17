---
trigger: manual
description:
globs:
---


@baseUrl = http://localhost:8088
@token = api_test-token

### 创建设计
POST {{base_url}}/api/dsn/design/create
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "示例设计",
  "description": "这是一个设计描述"
}


### 更新设计

public class DesignUpdateDTO {
    private Long id;
    private String uid;
    private String name;
    private String description;
    private String designStatus;
    private String kpayId;
    private String wpayId;
    private String payMethod;
    private String garminAppUuid;
    private Long coverImageId;
    private Long backgroundImageId;
    private String configJson;
} 
返回值：

{
  "code": 0,
  "msg": "success",
  "data": {
    "id": 2,
    "designUid": "ezv9lrxn2wt2kvaq9gqo8qkh",
    "name": "更新设计1",
    "description": "这是一个设计描述",
    "configJson": {
    },
    "designStatus": "draft",
    "kpayId": "41347",
    "wpayId": "",
    "payMethod": "none",
    "garminAppUuid": "fd9f0b66-3153-4b41-9f77-bf631741b363",
    "isActive": 1,
    "isDeleted": 0,
    "createdAt": 1751579341078,
    "updatedAt": 1751687430626,
    "version": 3,
    "user": {
      "id": 11,
      "username": "test",
      "nickname": null,
      "avatar": "https://cdn.wristo.io/test/avatar/c6afd98c-9770-4964-8503-93d6e5e0b210.png"
    },
    "coverImage": null,
    "backgroundImage": null
  }
}

### Design 分页查询 - GET 方式

GET {{baseUrl}}/api/dsn/design/page?pageNum=1&pageSize=1&orderBy=created_at:desc&populate=configJson,payment,release,product
Authorization: Bearer {{token}}

返回：
{
    "code": 0,
    "msg": "success",
    "data": {
        "pageNum": 1,
        "pageSize": 1,
        "total": 16,
        "pages": 16,
        "list": [
            {
                "id": 589,
                "designUid": "amfsu3zw8gn8l6ov4semx4x9",
                "name": "Hello",
                "description": "Hello",
                "configJson": null,
                "designStatus": "draft",
                "kpayId": "34343343",
                "wpayId": "",
                "payMethod": "none",
                "garminAppUuid": "",
                "isActive": 1,
                "isDeleted": 0,
                "createdAt": 1751632179625,
                "updatedAt": 1751632179625,
                "version": 1,
                "user": {
                    "id": 11,
                    "username": "test",
                    "nickname": null,
                    "avatar": "https://cdn.wristo.io/test/avatar/c6afd98c-9770-4964-8503-93d6e5e0b210.png"
                },
                "product": {
                    "appId": 146522,
                    "designId": "trZRmCaDn9KlbC3tECqlO",
                    "name": "Tgg",
                    "description": "Tgg",
                    "garminImageUrl": "",
                    "garminStoreUrl": "",
                    "garminAppUuid": "",
                    "trialLasts": 1.0,
                    "payment": {
                        "paymentMethod": "wpay",
                        "paymentMethodDesc": "WPay支付",
                        "kpayId": "",
                        "wpayId": "146522",
                        "price": 1.99,
                        "currency": "USD",
                        "paddleProductId": "pro_01k00hh2qj5w7vd6kh9jkgxshy",
                        "paddlePriceId": "pri_01k00hh39qkdeszk26fj6w4aqn"
                    },
                    "packageLog": null,
                    "release": {
                        "id": 5,
                        "productId": 4135,
                        "releaseVersion": "1.0.0",
                        "releaseTime": 1705314600000,
                        "packageUrl": "https://example.com/release/app.zip",
                        "releaseNote": "版本更新说明",
                        "packageSize": 15200,
                        "packageMd5": "abc123def456",
                        "deviceIds": "fenix7,fenix6",
                        "isDeleted": 0,
                        "createdAt": 1752365122630,
                        "updatedAt": 1752365122630,
                        "version": null
                    },
                    "categories": null,
                    "heroImages": null,
                    "bannerImages": null,
                    "user": null,
                    "createdAt": 1752365041213,
                    "updatedAt": 1752365041213,
                    "isActive": 1,
                    "isDeleted": 0
                }
            }
        ]
    }
}

### 根据UID获取设计

GET {{base_url}}/api/dsn/design/uid/amfsu3zw8gn8l6ov4semx4x9
Authorization: Bearer {{token}}

{
  "code": 0,
  "msg": "success",
  "data": {
    "id": 589,
    "designUid": "amfsu3zw8gn8l6ov4semx4x9",
    "name": "Hello",
    "description": "Hello",
    "configJson": {
      "name": "Hello",
      "kpayId": "34343343",
      "wpayId": 101906,
      "version": "1.0",
      "designId": "amfsu3zw8gn8l6ov4semx4x9",
      "elements": [
        {
          "x": 227,
          "y": 227,
          "id": "NRBQF3MzF3DoDtqs-8iQo",
          "font": "RobotoCondensed-Regular",
          "size": 36,
          "type": "time",
          "color": "#FFFFFF",
          "timeId": 0,
          "originX": "center",
          "originY": "center",
          "formatter": 0
        }
      ],
      "orderIds": [
        "tianchong-vS4M7HriuA39ShIF9987U",
        "NRBQF3MzF3DoDtqs-8iQo"
      ],
      "showUnit": false,
      "textCase": 0,
      "properties": {},
      "labelLengthType": 1,
      "themeBackgroundImages": []
    },
    "designStatus": "draft",
    "kpayId": "34343343",
    "wpayId": "",
    "payMethod": "none",
    "garminAppUuid": "",
    "isActive": 1,
    "isDeleted": 0,
    "createdAt": 1751632179625,
    "updatedAt": 1751632179625,
    "version": 1,
    "user": {
      "id": 11,
      "username": "test",
      "nickname": null,
      "avatar": "https://cdn.wristo.io/test/avatar/c6afd98c-9770-4964-8503-93d6e5e0b210.png"
    }
  }
}

### 删除设计
POST {{base_url}}/api/dsn/design/delete/amfsu3zw8gn8l6ov4semx4x9
Authorization: Bearer {{token}}

返回：

{
  "code": 0,
  "msg": "success",
  "data": null
}