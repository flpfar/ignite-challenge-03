import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function isAvailableInStock(productId: number) {
    const stockResponse = await api.get(`stock/${productId}`);
    const stockProduct: Stock = stockResponse.data;

    if (stockProduct.amount <= 1) {
      return false;
    }

    return true;
  }

  const addProduct = async (productId: number) => {
    try {
      
      const isProductAvailable = await isAvailableInStock(productId);

      if(!isProductAvailable) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productAlreadyOnCart = cart.find(
        (product) => product.id === productId
      );

      let newCart: Product[] = [] as Product[];

      if (productAlreadyOnCart) {
        newCart = cart.map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product
        );
      } else {
        const productResponse = await api.get(`products/${productId}`);
        const newCartProduct = { ...productResponse.data, amount: 1 };
        newCart = [...cart, newCartProduct];
      }

      setCart(newCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductOnCart = cart.some(product => product.id === productId);

      if(!isProductOnCart) throw new Error();

      const newCart = cart.filter(product => product.id !== productId)
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const isProductAvailable = await isAvailableInStock(productId);

      if(!isProductAvailable) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((product) =>
        product.id === productId
          ? { ...product, amount: amount }
          : product
      );

      setCart(newCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
