import { TOriginX, TOriginY } from 'fabric'
import { TextProps } from 'fabric'

export interface CustomObjectProps {
    id?: string;
    eleType?: string;
    left: number;
    top: number;
    originX: TOriginX;
    originY: TOriginY;
    fill: string;
}

/**
 * Custom text props
 */
export interface CustomTextProps extends CustomObjectProps {
    fontSize: number;
    fontFamily: string;
    formatter?: string;
}

/**
 * Custom image props
 */
export interface CustomImageProps extends CustomObjectProps {
    imageId?: string;
}

/**
 * Custom data props
 */
export interface CustomDataProps extends CustomTextProps{
    dataProperty?: string;
    goalProperty?: string;
}

/**
 * Custom icon props
 */
export interface CustomIconProps extends CustomDataProps {
    iconFontFamily?: string;
}

/**
 * 数据项标签，必须依赖于数据元素
 */
export interface CustomDataLabelProps extends CustomDataProps {
    
}

/**
 * 数据项单位，必须依赖于数据元素
 */
export interface CustomDataUnitProps extends CustomDataProps {
    
}

// Time props
export type TimeProps = TextProps & CustomTextProps