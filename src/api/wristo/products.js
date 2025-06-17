import axiosInstance from '@/config/axiosWristo'

export const getWPayProductByDesignId = async (data) => {
    const response = await axiosInstance.post(`/dsn/products/getOrCreateByDesignId`, {
        designId: data.designId,
        name: data.name,
        description: data.description,
        trialLasts: data.trialLasts,
        price: data.price,
        garminImageUrl: data.garminImageUrl,
        garminStoreUrl: data.garminStoreUrl
    })
    return response.data
}

export const updateProductByDesignId = async (data) => {
    const response = await axiosInstance.post('/dsn/products/updateByDesignId', {
        ...data,
        designId: data.designId,
        name: data.name,
        description: data.description,
        trialLasts: data.trialLasts,
        price: data.price,
        garminImageUrl: data.garminImageUrl,
        garminStoreUrl: data.garminStoreUrl
    })
    return response.data
}