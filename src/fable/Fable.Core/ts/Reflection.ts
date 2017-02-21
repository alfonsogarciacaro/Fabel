import { NonDeclaredType, getPropertyNames } from "./Util"
import List from "./List"
import FSymbol from "./Symbol"

export function resolveGeneric(idx: string | number, enclosing: List<any>): List<any> {
  try {
    const t = enclosing.head;
    if (t.generics == null) {
      return resolveGeneric(idx, enclosing.tail)
    }
    else {
      const name = typeof idx === "string"
        ? idx : Object.getOwnPropertyNames(t.generics)[idx];
      const resolved = t.generics[name];
      if (resolved == null) {
          return resolveGeneric(idx, enclosing.tail);
      }
      else if (resolved instanceof NonDeclaredType && resolved.kind === "GenericParam") {
          return resolveGeneric(resolved.definition as string, enclosing.tail);
      }
      else {
          return new List(resolved, enclosing);
      }
    }
  }
  catch (err) {
    throw new Error(`Cannot resolve generic argument ${idx}: ${err}`);
  }
}

export function getType(obj: any): any {
  const t = typeof obj;
  switch (t) {
    case "boolean":
    case "number":
    case "string":
    case "function":
      return t;
    default:
      return Object.getPrototypeOf(obj).constructor
  }
}

// TODO: This needs improvement, check namespace for non-custom types?
export function getTypeFullName(typ: any, option?: string): string {
  function trim(fullName: string, option?: string) {
    if (typeof fullName !== "string") {
      return "unknown";
    }
    if (option === "name") {
      const i = fullName.lastIndexOf('.');
      return fullName.substr(i + 1);
    }
    if (option === "namespace") {
      const i = fullName.lastIndexOf('.');
      return i > -1 ? fullName.substr(0, i) : "";
    }
    return fullName;
  }
  if (typeof typ === "string") {
    return typ;
  }
  else if (typ instanceof NonDeclaredType) {
      switch (typ.kind) {
        case "Unit":
          return "unit";
        case "Option":
          return getTypeFullName(typ.generics, option) + " option";
        case "Array":
          return getTypeFullName(typ.generics, option) + "[]";
        case "Tuple":
          return (typ.generics as FunctionConstructor[]).map(x => getTypeFullName(x, option)).join(" * ");
        case "GenericParam":
        case "Interface":
          return typ.definition as string;
        case "GenericType":
          return getTypeFullName(typ.definition, option);
        case "Any":
        default:
          return "unknown";
      }
  }
  else {
    // Attention: this doesn't work with Object.getPrototypeOf
    const proto = typ.prototype;
    return trim(typeof proto[FSymbol.reflection] === "function"
      ? proto[FSymbol.reflection]().type : null, option);
  }
}

export function getPrototypeOfType(typ: FunctionConstructor) {
  if (typeof typ === "string") {
    return null;
  }
  else if (typ instanceof NonDeclaredType) {
    return typ.kind === "GenericType" ? (typ.definition as any).prototype : null;
  }
  else {
    return typ.prototype;
  }
}

export function getPropertyValues(obj: any): any[] {
    const keys = getPropertyNames(obj), values = [];
    for (let i=0; i<keys.length; i++) {
      values.push(obj[keys[i]]);
    }
    return values;
}

export function getTupleElements(typ: any): FunctionConstructor[] {
  if (typ instanceof NonDeclaredType && typ.kind === "Tuple") {
    return typ.generics as FunctionConstructor[];
  }
  throw new Error("Type " + getTypeFullName(typ) + " is not a tuple type.");
}

export function isTupleType(typ: any): boolean {
  if (typ instanceof NonDeclaredType) {
    return typ.kind === "Tuple";
  }
  return false;
}